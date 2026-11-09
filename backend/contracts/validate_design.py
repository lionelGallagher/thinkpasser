"""Validate design contracts; --full uses the pinned schema validation tools."""
import argparse
import json
import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent

def run(full=False):
    spec = json.loads((BASE / "openapi.json").read_text(encoding="utf-8"))
    model = json.loads((BASE / "state-machines.json").read_text(encoding="utf-8"))
    examples = json.loads((BASE / "examples.json").read_text(encoding="utf-8"))["cases"]
    remote = json.loads((BASE / "remote-signaling.schema.json").read_text(encoding="utf-8"))
    remote_examples = json.loads((BASE / "remote-examples.json").read_text(encoding="utf-8"))["cases"]
    operations = []
    references = 0
    def walk(node):
        nonlocal references
        if isinstance(node, dict):
            if "$ref" in node:
                pointer = node["$ref"]
                assert pointer.startswith("#/"), pointer
                target = spec
                for part in pointer[2:].split("/"):
                    target = target[part.replace("~1", "/").replace("~0", "~")]
                references += 1
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)
    walk(spec)
    for path, methods in spec["paths"].items():
        for method, operation in methods.items():
            assert operation["x-transaction"] in model["transactions"]
            assert operation["x-roles"], operation["operationId"]
            assert set(re.findall(r"\{(\w+)\}", path)) == {
                p["name"] for p in operation.get("parameters", []) if p["in"] == "path"
            }
            operations.append(operation["operationId"])
    assert len(operations) == len(set(operations)), "Duplicate operationId"
    # Check cross-file obligations that a valid OpenAPI document alone cannot enforce.
    assert "disclosureHash" in spec["components"]["schemas"]["Quote"]["required"]
    assert spec["paths"]["/machines/{machineId}/sessions"]["post"]["responses"]["202"]["content"]["application/json"]["schema"]["$ref"].endswith("/ConnectionAttempt")
    assert spec["paths"]["/agent/policy-sync"]["post"]["security"] == [{"deviceMTLS": []}]
    assert "revoked" not in model["machines"]["session"]["transitions"]
    assert model["machines"]["session"]["transitions"]["closing"] == ["closed"]
    assert model["transactions"]["T04"]["locks"] == model["globalLockOrder"]
    assert model["machines"]["computerInventory"]["transitions"]["clearing"] == ["inspection", "quarantined"]
    assert model["machines"]["lease"]["transitions"]["clearing"] == ["ended"]
    assert "workspaceKind" in spec["components"]["schemas"]["Account"]["allOf"][0]["then"]["required"]
    assert spec["components"]["schemas"]["Register"]["properties"]["workspaceKind"]["default"] == "personal"
    assert "remoteEvents" in spec["components"]["schemas"]["AgentPollResult"]["required"]
    assert spec["paths"]["/agent/session-events"]["post"]["security"] == [{"deviceMTLS": []}]
    assert {"description", "leaseId", "kind"} <= set(spec["components"]["schemas"]["Ticket"]["required"])
    # Compare through canonical JSON so local ref names can change without schema drift.
    for name, schema in remote["$defs"].items():
        expected = json.dumps(spec["components"]["schemas"][name], ensure_ascii=False, sort_keys=True).replace("#/components/schemas/", "#/$defs/")
        assert json.loads(expected) == schema, ("Remote/OpenAPI schema drift", name)
    for name, machine in model["machines"].items():
        states = machine["transitions"]
        assert machine["initial"] in states, name
        for terminal in machine["terminal"]:
            assert terminal in states and not states[terminal], (name, terminal)
        for source, destinations in states.items():
            assert len(destinations) == len(set(destinations)), (name, source)
            assert all(target in states for target in destinations), (name, source)
    for tx in model["transactions"].values():
        assert (ROOT / "docs/design" / tx["doc"].split("#")[0]).exists()
    data = json.loads((ROOT / "docs/questionnaires/remote-platform-questionnaire-data.json").read_text(encoding="utf-8"))
    answer_md = next((ROOT / "docs/questionnaires").glob("*.md")).read_text(encoding="utf-8")
    answers = [q for section in data["sections"] for q in section["questions"]]
    assert len(answers) == 13
    for question in answers:
        assert question["review"]["status"] == "confirmed"
        assert question["answerRaw"] in answer_md, question["id"]
    documents = set((ROOT / "docs").rglob("*.md"))
    documents.update(ROOT / p for p in ["README.md","web/README.md","admin/README.md","supplier/README.md","client/README.md","client/preview/README.md","backend/README.md","client/rustdesk/README.md","web/remote-desktop/gateway-contract.md"])
    local_links = 0
    fence = chr(96)*3
    for document in documents:
        content = re.sub(fence+r"[\s\S]*?"+fence, "", document.read_text(encoding="utf-8"))
        for target in re.findall(r"!?\[[^\]\n]*\]\(([^\n]+?)\)", content):
            target = target.strip().strip("<>").split(' "', 1)[0]
            if re.match(r"^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#|//)", target):
                continue
            target = unquote(target.split("#",1)[0].split("?",1)[0])
            if target:
                assert (document.parent / target).exists(), (str(document), target)
                local_links += 1
    if full:
        from openapi_spec_validator import validate
        from jsonschema import Draft202012Validator, FormatChecker
        validate(spec)
        Draft202012Validator.check_schema(remote)
        for case in examples:
            schema = {"$ref":"#/components/schemas/" + case["schema"],"components":spec["components"]}
            errors = list(Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(case["value"]))
            assert (not errors) == case["valid"], (case["name"], [error.message for error in errors])
        for case in remote_examples:
            errors = list(Draft202012Validator(remote, format_checker=FormatChecker()).iter_errors(case["value"]))
            assert (not errors) == case["valid"], (case["name"], [error.message for error in errors])
    return {
        "passed": True, "apiOperations":len(operations),
        "schemas":len(spec["components"]["schemas"]), "references":references,
        "stateMachines":len(model["machines"]), "transactions":len(model["transactions"]),
        "originalConfirmedAnswers":len(answers), "localLinks":local_links,
        "fullSchemaValidation":full, "fieldExamplesValidated":len(examples) if full else 0,
        "remoteMessageExamplesValidated":len(remote_examples) if full else 0,
        "remoteSchemasCompared":len(remote["$defs"]),
        "doesNotVerify":["production Java API","MySQL migration or concurrent transactions","real desktop control","real supplier or payment results","browser layout or screenshots"]
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true")
    args = parser.parse_args()
    print(json.dumps(run(args.full), ensure_ascii=False))
