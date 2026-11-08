<script setup lang="ts">
import { computed } from "vue";
import Icon from "../../shared/Icon.vue";
import Status from "../../shared/Status.vue";
import {
  state,
  currentAccount,
  visibleMachines,
  myMachines,
  isMain,
  openDesktop,
  safely,
} from "../../shared/store";
import {
  phase,
  remaining,
  date,
  money,
  COUNTRY,
  canConnect,
} from "../../shared/models";
const active = computed(() =>
  visibleMachines.value.filter(
    (m) => phase(m) === "desktop" && m.state !== "preparing",
  ),
);
const metrics = computed(() => [
  {
    label: isMain.value ? "独享电脑" : "我的电脑",
    value: visibleMachines.value.filter((m) => m.state !== "preparing").length,
    suffix: "台",
    icon: "monitor",
    note: active.value.length + " 台在有效租期内",
    tone: "green",
  },
  {
    label: "AI 工具权益",
    value: visibleMachines.value.reduce(
      (n, m) =>
        n +
        m.ai.filter(
          (a) => a.state === "available" && a.promisedUntil > Date.now(),
        ).length,
      0,
    ),
    suffix: "项",
    icon: "sparkles",
    note: "Claude Code / Codex",
    tone: "purple",
  },
  {
    label: "准备中的订单",
    value: state.orders.filter((o) => o.state === "preparing").length,
    suffix: "笔",
    icon: "package",
    note: "按交付单元独立准备",
    tone: "blue",
  },
  {
    label: "团队成员",
    value: state.members.filter((m) => m.enabled).length,
    suffix: "人",
    icon: "users",
    note: "独立账号，独享环境",
    tone: "amber",
  },
]);
</script>
<template>
  <section class="page-heading">
    <div>
      <p class="eyebrow">YOUR WORKSPACE, EVERYWHERE</p>
      <h1>
        {{ currentAccount.name }}，欢迎回来<span class="greeting-dot">.</span>
      </h1>
      <p>电脑已经就位，让今天的好想法继续发生。</p>
    </div>
    <a v-if="isMain" class="button primary" href="#marketplace"
      ><Icon name="plus" :size="17" />选购电脑</a
    >
  </section>
  <div class="hero-panel">
    <div class="hero-copy">
      <span class="hero-label"><i></i> A SPACE TO BUILD</span>
      <h2>把灵感带来，<br />把环境交给我们。</h2>
      <p>
        独享远程电脑，搭配你顺手的 AI 工具。<br />打开浏览器，或从桌面客户端继续工作。
      </p>
      <a class="button hero-button" href="#machines"
        >进入我的电脑 <Icon name="arrowUp" :size="17"
      /></a>
      <div class="hero-foot">
        <span><Icon name="shield" :size="14" />独享开发环境</span
        ><span><Icon name="globe" :size="14" />Windows / macOS</span>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="orbit orbit-one"></div>
      <div class="orbit orbit-two"></div>
      <div class="orbit-dot dot-one"></div>
      <div class="orbit-dot dot-two"></div>
      <div class="floating-tag tag-claude">
        <span class="ai-glyph claude">✳</span>Claude Code
      </div>
      <div class="floating-tag tag-codex">
        <span class="ai-glyph codex">⌘</span>Codex
      </div>
      <div class="hero-terminal">
        <header>
          <span class="window-dots"><i></i><i></i><i></i></span
          ><span>your next idea</span><Icon name="terminal" :size="13" />
        </header>
        <div>
          <p><b>~/workspace</b> <span>on</span> main</p>
          <p><em>❯</em> let's build something.</p>
          <p class="terminal-muted">环境已准备，等待你的下一个想法</p>
          <p><em>❯</em> <i class="typing-cursor"></i></p>
        </div>
        <footer>
          <span><i></i> dedicated workspace</span><span>∞ possibilities</span>
        </footer>
      </div>
      <div class="hero-device"><span></span><i>✦</i></div>
    </div>
  </div>
  <div class="metrics-grid">
    <article v-for="metric in metrics" :key="metric.label" class="metric-card">
      <div>
        <span>{{ metric.label }}</span
        ><span class="metric-icon" :class="metric.tone"
          ><Icon :name="metric.icon" :size="18"
        /></span>
      </div>
      <p>
        {{ metric.value }}<small>{{ metric.suffix }}</small>
      </p>
      <span class="metric-note"
        ><i v-if="metric.tone === 'green'"></i>{{ metric.note }}</span
      >
    </article>
  </div>
  <div class="overview-columns">
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>继续你的工作</h2>
          <p>当前账号的专属电脑</p>
        </div>
        <a class="text-link" href="#machines"
          >全部电脑 <Icon name="arrowRight" :size="14"
        /></a>
      </div>
      <div v-if="!myMachines.length" class="compact-empty">
        <Icon name="monitor" :size="24" />
        <p>还没有分配给你的电脑</p>
        <a v-if="isMain" href="#machines">前往团队资源分配</a>
      </div>
      <article
        v-for="machine in myMachines"
        :key="machine.id"
        class="resume-machine"
      >
        <span class="device-tile" :class="machine.os"
          ><Icon name="monitor" :size="26"
        /></span>
        <div>
          <h3>{{ machine.name }}</h3>
          <p>
            {{ COUNTRY[machine.country]?.flag }} {{ machine.region
            }}<span>·</span>{{ machine.memory }} GB / {{ machine.disk }} GB
          </p>
          <span class="small-muted"
            >租期剩余 {{ remaining(machine.expiresAt) }}</span
          >
        </div>
        <button
          class="button"
          :class="{ primary: canConnect(machine, currentAccount) }"
          :disabled="!canConnect(machine, currentAccount)"
          @click="safely(() => openDesktop(machine.id))"
        >
          {{ phase(machine) === "desktop" ? "连接电脑" : "已到期"
          }}<Icon name="arrowUp" :size="15" />
        </button>
      </article>
      <div class="panel-bottom-note">
        <Icon name="shield" :size="14" />断开控制连接后，远端任务继续运行。
      </div>
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>最近动态</h2>
          <p>工作空间的每一步，都有记录</p>
        </div>
        <Icon name="activity" class="muted" :size="17" />
      </div>
      <ol class="activity-list">
        <li v-for="event in state.activities.slice(0, 3)" :key="event.id">
          <span :class="'activity-dot ' + event.tone"></span>
          <div>
            <strong>{{ event.label }}</strong>
            <p>{{ event.detail }}</p>
            <time>{{ date(event.at, true) }}</time>
          </div>
        </li>
      </ol>
    </section>
  </div>
  <div class="tool-strip">
    <div>
      <span class="tool-strip-mark">✳</span>
      <div>
        <h3>你的电脑，你的 AI 工作流。</h3>
        <p>Claude Code、Codex 可以自由搭配，也可以只选择一台电脑。</p>
      </div>
    </div>
    <a href="#marketplace" class="text-link"
      >了解组合方式 <Icon name="arrowUp" :size="15"
    /></a>
  </div>
</template>
