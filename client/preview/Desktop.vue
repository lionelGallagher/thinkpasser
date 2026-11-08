<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "../../web/shared/Icon.vue";
import EmptyState from "../../web/shared/EmptyState.vue";
import {
  state,
  ui,
  myMachines,
  currentAccount,
  openDesktop,
  safely,
  notify,
} from "../../web/shared/store";
import { canConnect } from "../../web/shared/models";
const location = window.location;
const machine = computed(() =>
  state.machines.find((m) => m.id === ui.activeMachineId),
);
const valid = computed(
  () => machine.value && canConnect(machine.value, currentAccount.value),
);
const activeFile = ref("hello.ts"),
  audio = ref(false),
  command = ref(""),
  lines = ref([
    "Thinkpasser interactive workspace preview.",
    "此界面未连接真实电脑；不会执行远程命令。",
    "输入 help 查看本地演示命令。",
  ]);
const source: Record<string, string> = {
  "hello.ts":
    "import { createWorkspace } from './workspace'\n\nconst workspace = createWorkspace({\n  dedicated: true,\n  tools: ['Claude Code', 'Codex'],\n})\n\nexport async function buildSomething() {\n  const idea = await workspace.open()\n  return idea.makeItHappen()\n}\n",
  "workspace.ts":
    "export function createWorkspace(options: {\n  dedicated: boolean\n  tools: string[]\n}) {\n  return {\n    open: async () => ({\n      makeItHappen: () => 'Hello, possibilities.',\n    }),\n  }\n}\n",
  "README.md":
    "# Your dedicated workspace\n\nA place for your next idea.\n\n这里是桌面交互预览，不是真实远程文件。\n真实桌面接入需要平台授权和设备认证。\n",
};
function runCommand() {
  const value = command.value.trim();
  if (!value) return;
  lines.value.push("~/workspace ❯ " + value);
  const answer: Record<string, string> = {
    help: "可用的本地演示命令：help · pwd · ls · clear",
    pwd: "/demo/workspace",
    ls: "hello.ts   workspace.ts   README.md",
  };
  if (value === "clear") lines.value = [];
  else lines.value.push(answer[value] || "这是本地交互预览，不执行系统命令。");
  command.value = "";
}
async function fullscreen() {
  try {
    await document.querySelector(".desktop-frame")?.requestFullscreen();
  } catch {
    notify("当前浏览器未开放全屏，请使用窗口浏览");
  }
}
</script>
<template>
  <template v-if="valid"
    ><div class="desktop-page-heading">
      <a href="#machines" class="text-link muted"
        ><Icon name="arrowLeft" :size="15" />我的电脑</a
      >
      <div>
        <span class="preview-label"><i></i>交互预览 · 未连接真实电脑</span
        ><span class="small-muted"
          >{{ machine?.code }} / {{ machine?.name }}</span
        >
      </div>
    </div>
    <section class="desktop-frame">
      <header class="desktop-toolbar">
        <div>
          <Icon name="monitor" :size="18" /><strong>{{ machine?.name }}</strong
          ><span class="desktop-host">{{ machine?.code }}</span>
        </div>
        <div>
          <button
            class="toolbar-button"
            title="鼠标输入说明"
            aria-label="鼠标输入说明"
            @click="notify('交互预览不向真实主机发送键鼠输入')"
          >
            <Icon name="mouse" :size="17" /></button
          ><button
            class="toolbar-button"
            :class="{ enabled: audio }"
            aria-label="系统声音预览开关"
            @click="
              audio = !audio;
              notify('只切换界面偏好，未采集或播放远程声音');
            "
          >
            <Icon name="volume" :size="17" /></button
          ><button
            class="toolbar-button"
            aria-label="文件传输说明"
            @click="
              notify('真实文件传输需绑定有效会话；本预览未连接远程文件系统')
            "
          >
            <Icon name="folder" :size="17" /></button
          ><span class="toolbar-divider"></span
          ><button
            class="toolbar-button"
            aria-label="全屏预览"
            @click="fullscreen"
          >
            <Icon name="maximize" :size="17" /></button
          ><button
            class="desktop-disconnect"
            @click="
              ui.activeMachineId = '';
              location.hash = 'machines';
            "
          >
            结束预览
          </button>
        </div>
      </header>
      <div class="preview-os-bar">
        <span class="preview-os-logo">✦</span><strong>Code</strong
        ><span>文件</span><span>编辑</span><span>查看</span><span>终端</span
        ><time>{{
          new Date().toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
          })
        }}</time>
      </div>
      <div class="code-window">
        <div class="code-titlebar">
          <span class="window-dots"><i></i><i></i><i></i></span>
          <div>
            <Icon name="search" :size="12" />workspace — Thinkpasser Preview
          </div>
          <Icon name="menu" :size="13" />
        </div>
        <div class="code-body">
          <div class="editor-rail">
            <Icon name="file" :size="21" /><Icon
              name="search"
              :size="21"
            /><Icon name="layers" :size="21" /><Icon
              name="terminal"
              :size="21"
            /><Icon name="settings" :size="21" />
          </div>
          <aside class="file-explorer">
            <strong>EXPLORER <Icon name="more" :size="14" /></strong>
            <p><Icon name="chevronDown" :size="13" />WORKSPACE</p>
            <button
              v-for="name in Object.keys(source)"
              :key="name"
              :class="{ active: name === activeFile }"
              @click="activeFile = name"
            >
              <span :class="{ typescript: name.endsWith('.ts') }">{{
                name.endsWith(".ts") ? "TS" : "M↓"
              }}</span
              >{{ name }}
            </button>
          </aside>
          <div class="editor-main">
            <div class="editor-tab">
              <span>{{ activeFile.endsWith(".ts") ? "TS" : "M↓" }}</span
              >{{ activeFile
              }}<button
                aria-label="关闭文件提示"
                @click="notify('演示文件标签保持打开')"
              >
                <Icon name="x" :size="12" />
              </button>
            </div>
            <div class="code-breadcrumb">
              workspace <Icon name="chevronRight" :size="12" />{{ activeFile }}
            </div>
            <div class="code-lines">
              <div
                v-for="(line, index) in source[activeFile]?.split('\n')"
                :key="index"
              >
                <span>{{ index + 1 }}</span
                ><code
                  :class="{
                    comment: line.startsWith('//'),
                    keyword: /import|export|return|const/.test(line),
                  }"
                  >{{ line || " " }}</code
                >
              </div>
            </div>
            <div class="terminal-panel">
              <header>
                <span>PROBLEMS</span><span>OUTPUT</span><strong>TERMINAL</strong
                ><Icon name="plus" :size="13" />
              </header>
              <div class="terminal-lines">
                <p v-for="(line, index) in lines" :key="index">{{ line }}</p>
              </div>
              <form class="terminal-input" @submit.prevent="runCommand">
                <label for="preview-command">~/workspace <b>❯</b></label
                ><input
                  id="preview-command"
                  v-model="command"
                  placeholder="输入 help（仅本地演示）"
                  autocomplete="off"
                  spellcheck="false"
                />
              </form>
            </div>
          </div>
        </div>
        <footer class="code-statusbar">
          <span><Icon name="layers" :size="12" />main*</span
          ><span>✓ 0　⚠ 0</span
          ><span class="push-right">UTF-8　 TypeScript　 Prettier</span>
        </footer>
      </div>
      <footer class="desktop-status">
        <span><Icon name="lock" :size="12" />本地界面预览</span
        ><span>无真实画面、网络延迟或设备状态数据</span
        ><span>⌘ / Ctrl 快捷键待真机验证</span>
      </footer>
    </section></template
  ><template v-else
    ><section class="page-heading">
      <div>
        <p class="eyebrow">YOUR DESKTOP, ANYWHERE</p>
        <h1>远控工作区<span class="greeting-dot">.</span></h1>
        <p>选择分配给当前账号的有效电脑，查看桌面界面预览。</p>
      </div>
    </section>
    <EmptyState
      title="先选择你的电脑"
      description="只显示当前账号有权使用的独享电脑。此处不会连接真实机器。"
      icon="monitor"
      ><button
        v-for="m in myMachines.filter((m) => canConnect(m, currentAccount))"
        :key="m.id"
        class="button primary"
        @click="safely(() => openDesktop(m.id))"
      >
        {{ m.name }} <Icon name="arrowUp" :size="15" /></button
      ><a
        v-if="!myMachines.some((m) => canConnect(m, currentAccount))"
        class="button"
        href="#machines"
        >查看电脑与租期状态</a
      ></EmptyState
    ></template
  >
</template>
