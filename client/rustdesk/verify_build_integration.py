"""Exercise patched Python build/MSI transformations without native tools."""

import base64
import importlib.util
import os
from pathlib import Path
import runpy
import shutil
import subprocess
from types import SimpleNamespace
from unittest.mock import patch
import xml.etree.ElementTree as ET


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def verify(root: Path, fixtures: Path) -> list[dict]:
    build = runpy.run_path(str(root / 'build.py'), run_name='static_build_review')
    functions = build['get_features'].__globals__
    for windows, osx in ((True, False), (False, True)):
        functions.update(windows=windows, osx=osx)
        args = build['make_parser']().parse_args(['--thinkpasser', '--flutter'])
        features = build['get_features'](args)
        if 'thinkpasser' not in features or 'flutter' not in features:
            raise RuntimeError('Product build feature is not selected')
        if ('screencapturekit' in features) != osx:
            raise RuntimeError('Product system audio feature crossed platform boundaries')
        ordinary = build['get_features'](build['make_parser']().parse_args(['--flutter']))
        if ordinary != ['flutter']:
            raise RuntimeError('Ordinary upstream Flutter build feature selection changed')
        try:
            build['get_features'](build['make_parser']().parse_args(['--thinkpasser']))
        except ValueError:
            pass
        else:
            raise RuntimeError('Non-Flutter product build was accepted')
    functions.update(windows=False, osx=False)
    try:
        build['get_features'](build['make_parser']().parse_args(['--thinkpasser', '--flutter']))
    except ValueError:
        pass
    else:
        raise RuntimeError('Excluded desktop platform accepted the product build')

    profile = module(root / 'res/thinkpasser/build_profile.py', 'product_build_review')
    with patch.dict(os.environ, {}, clear=True):
        try:
            profile.validate_environment(SimpleNamespace(skip_cargo=False))
        except ValueError:
            pass
        else:
            raise RuntimeError('Missing deployment endpoints silently accepted')
    with patch.dict(os.environ, {
        'THINKPASSER_RENDEZVOUS_SERVER': 'id.example.invalid:21116',
        'THINKPASSER_RELAY_SERVER': 'relay.example.invalid:21117',
        'THINKPASSER_SERVER_KEY': base64.b64encode(bytes(32)).decode(),
    }):
        profile.validate_environment(SimpleNamespace(skip_cargo=False))
        try:
            profile.validate_environment(SimpleNamespace(skip_cargo=True))
        except ValueError:
            pass
        else:
            raise RuntimeError('Stale native artifact reuse was accepted')
    bundle = fixtures / 'forbidden-printer-bundle'
    forbidden = bundle / 'drivers/RustDeskPrinterDriver/test.inf'
    forbidden.parent.mkdir(parents=True, exist_ok=True)
    forbidden.write_text('fixture only', encoding='utf-8')
    try:
        profile.assert_bundle_no_printer(bundle)
    except ValueError:
        pass
    else:
        raise RuntimeError('Printer driver payload was accepted')

    msi = module(root / 'res/thinkpasser/msi_profile.py', 'product_msi_review')
    transformed = msi.transformed_sources(root / 'res/msi')
    ids, actions, refs, properties = set(), set(), set(), set()
    for path, text in transformed.items():
        parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True, insert_pis=True))
        tree = ET.fromstring(text, parser=parser)
        if text.count('<?include') != path.read_text(encoding='utf-8').count('<?include'):
            raise RuntimeError(f'MSI preprocessor includes lost: {path.name}')
        for node in tree.iter():
            if not isinstance(node.tag, str):
                continue
            kind = node.tag.rsplit('}', 1)[-1]
            if kind == 'CustomAction': ids.add(node.get('Id'))
            if kind == 'Custom': actions.add(node.get('Action'))
            if kind == 'ComponentRef': refs.add(node.get('Id'))
            if kind == 'Property': properties.add(node.get('Id'))
    if 'InstallPrinter' in ids | actions or msi.REMOVED_COMPONENTS & refs or msi.REMOVED_PROPERTIES & properties:
        raise RuntimeError('Excluded MSI installation/legacy-launch path remains active')
    if not {'CreateStartService', 'TryStopDeleteService', 'UninstallPrinter'} <= actions:
        raise RuntimeError('MSI service lifecycle or legacy printer cleanup was removed')
    if 'Product.Registry.ProductReturn' not in refs:
        raise RuntimeError('Dedicated product return registration is missing')
    checks = [{
        'check': 'patched-python-build-and-msi-transform-executed', 'passed': True,
        'scope': 'Build flag selection, missing environment/stale artifact rejection, forbidden asset rejection and XML transformation only; no native payload or MSI executed',
        'platformsSimulatedForBuildFlags': ['windows', 'macos', 'unsupported-linux'],
        'nativePayloadProvenanceInvocationVerified': False,
    }]
    git = shutil.which('git')
    bash = Path(git).parent.parent / 'bin/bash.exe' if os.name == 'nt' and git else Path(shutil.which('bash') or '')
    if bash.is_file():
        subprocess.run([str(bash), '--noprofile', '--norc', '-n', str(root / '.github/scripts/sign-macos-app.sh')],
                       check=True, capture_output=True, text=True)
        checks.append({'check': 'macos-signer-bash-syntax', 'passed': True,
                       'scope': 'bash -n only; codesign and macOS tools not executed'})
    return checks
