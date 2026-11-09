<script setup lang="ts">
import { useNow } from "../../shared/useNow";
const now = useNow();
import { computed, ref } from "vue";
import Icon from "../../shared/Icon.vue";
import Status from "../../shared/Status.vue";
import EmptyState from "../../shared/EmptyState.vue";
import {
  state,
  currentAccount,
  isMain,
  isTeam,
  confirmPersonalActivation,
  myMachines,
  visibleMachines,
  openDialog,
  openDesktop,
  safely,
  requestRestart,
  askConfirm,
  downloadExport,
} from "../../shared/store";
import {
  AI_NAME,
  COUNTRY,
  canConnect,
  canExport,
  phase,
  remaining,
  date,
  type Machine,
} from "../../shared/models";
const props = defineProps<{ desktop?: boolean }>();
const tab = ref("mine"),
  search = ref("");
const machines = computed(() =>
  (isTeam.value && tab.value === "team"
    ? visibleMachines.value
    : myMachines.value
  ).filter(
    (m) =>
      !search.value ||
      [m.code, m.name, m.region]
        .join(" ")
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
function owner(m: Machine) {
  return state.members.find((a) => a.id === m.assignedTo)?.name || "待分配";
}
function connect(m: Machine) {
  safely(() => openDesktop(m.id));
}
</script>
<template>
  <section class="page-heading">
    <div>
      <h1>我的电脑</h1>
      <p>你的环境、你的工具，随时接着上次的工作继续。</p>
    </div>
    <a v-if="isMain" class="button primary" href="#marketplace"
      ><Icon name="plus" :size="17" />选购电脑</a
    >
  </section>
  <div class="filter-bar">
    <div class="segmented">
      <button :class="{ selected: tab === 'mine' }" @click="tab = 'mine'">
        {{ isTeam ? "分配给我" : "全部电脑" }}
        <span>{{ myMachines.length }}</span></button
      ><button
        v-if="isMain && isTeam"
        :class="{ selected: tab === 'team' }"
        @click="tab = 'team'"
      >
        团队资源 <span>{{ visibleMachines.length }}</span>
      </button>
    </div>
    <label class="search-field"
      ><Icon name="search" :size="16" /><input
        v-model="search"
        placeholder="搜索名称或电脑编号"
        aria-label="搜索我的电脑"
    /></label>
  </div>
  <div v-if="tab === 'team'" class="inline-note">
    <Icon
      name="shield"
      :size="16"
    />主账号管理团队资源；只有实际分配给自己的电脑可以进入桌面。
  </div>
  <div v-if="machines.length" class="machine-grid">
    <article v-for="machine in machines" :key="machine.id" class="machine-card">
      <div class="machine-card-top">
        <span class="device-tile" :class="machine.os"
          ><Icon name="monitor" :size="27" /></span
        ><Status
          :tone="
            machine.state === 'preparing'
              ? 'blue'
              : machine.state === 'unknown'
                ? 'amber'
                : phase(machine, now) === 'desktop'
                  ? 'green'
                  : 'amber'
          "
          >{{
            machine.state === "preparing"
              ? "准备中"
              : machine.state === "resetting"
                ? "交接／清理中"
                : machine.state === "unknown"
                  ? "连接待检查"
                  : phase(machine, now) === "desktop"
                    ? "租约有效"
                    : phase(machine, now) === "export_only"
                      ? "仅可导出"
                      : "已到期"
          }}</Status
        ><button
          class="icon-button machine-detail-trigger"
          :aria-label="'查看' + machine.code + '详情'"
          @click="openDialog('detail', machine.id)"
        >
          <Icon name="more" />
        </button>
      </div>
      <h2>{{ machine.name }}</h2>
      <p class="machine-code">
        {{ machine.code }} <span>·</span>{{ COUNTRY[machine.country]?.flag }}
        {{ machine.region }}
      </p>
      <div class="machine-specs">
        <span><Icon name="cpu" :size="15" />{{ machine.cpu }}</span
        ><span><Icon name="memory" :size="15" />{{ machine.memory }} GB</span
        ><span
          ><Icon name="disk" :size="15" />{{
            machine.disk >= 1024 ? "1 TB" : machine.disk + " GB"
          }}</span
        >
      </div>
      <div class="machine-ai">
        <span v-if="!machine.ai.length" class="empty-tools"
          ><Icon name="terminal" :size="14" />纯电脑 · 可按需加购 AI</span
        ><span
          v-for="ai in machine.ai.filter((a) => a.state !== 'terminated')"
          :key="ai.id"
          class="entitlement"
          :class="[
            ai.provider,
            {
              muted:
                ai.state !== 'available' ||
                now < ai.promisedFrom ||
                now >= ai.promisedUntil,
            },
          ]"
          ><span
            >{{ ai.provider === "claude" ? "✳" : "⌘" }}
            {{ AI_NAME[ai.provider] }}</span
          ><i
            :class="{
              off:
                ai.state !== 'available' ||
                now < ai.promisedFrom ||
                now >= ai.promisedUntil,
            }"
          ></i
          ><small>{{
            ai.state === "preparing"
              ? "开通中"
              : ai.state === "interrupted"
                ? "检查中"
                : now >= ai.promisedUntil
                  ? "已到期"
                  : now < ai.promisedFrom
                    ? "待生效"
                    : remaining(ai.promisedUntil, now)
          }}</small></span
        >
      </div>
      <div class="machine-lease">
        <span
          ><Icon name="calendar" :size="14" />{{
            machine.state === "preparing"
              ? "验收后起租"
              : date(machine.expiresAt, true) + " 到期"
          }}</span
        ><strong
          v-if="machine.state !== 'preparing'"
          :class="{ warning: phase(machine, now) !== 'desktop' }"
          >{{ remaining(machine.expiresAt) }}</strong
        >
      </div>
      <div v-if="tab === 'team'" class="machine-owner">
        <span class="avatar tiny">{{
          machine.assignedTo ? owner(machine).slice(-2) : "—"
        }}</span
        ><span>{{ owner(machine) }}</span
        ><button
          v-if="isMain && phase(machine, now) === 'desktop'"
          class="text-link"
          @click="openDialog('assign', machine.id)"
        >
          {{ machine.assignedTo ? "调整分配" : "分配电脑" }}
        </button>
      </div>
      <div class="machine-actions">
        <button
          v-if="
            !isTeam &&
            machine.state === 'online' &&
            phase(machine, now) === 'desktop' &&
            !machine.assignedTo
          "
          class="button primary"
          @click="confirmPersonalActivation(machine.id)"
        >
          切换到这台电脑
        </button>
        <button
          v-if="canExport(machine, currentAccount, now)"
          class="button primary"
          @click="safely(() => downloadExport(machine.id))"
        >
          <Icon name="download" :size="16" />导出演示清单</button
        ><button
          v-else
          class="button"
          :class="{ primary: canConnect(machine, currentAccount, now) }"
          :disabled="!canConnect(machine, currentAccount, now)"
          @click="connect(machine)"
        >
          <Icon name="arrowUp" :size="16" />{{
            machine.assignedTo && machine.assignedTo !== currentAccount.id
              ? "仅可管理"
              : machine.state === "preparing"
                ? "等待交付"
                : "连接电脑"
          }}</button
        ><button
          v-if="
            isMain &&
            machine.state !== 'preparing' &&
            phase(machine, now) !== 'none'
          "
          class="button subtle"
          @click="openDialog('checkout', machine.id, 'renewal')"
        >
          续费</button
        ><button
          v-if="
            isMain &&
            phase(machine, now) === 'desktop' &&
            machine.state !== 'preparing'
          "
          class="icon-button"
          aria-label="加购AI权益"
          @click="openDialog('checkout', machine.id, 'ai_addon')"
        >
          <Icon name="sparkles" />
        </button>
      </div>
      <p v-if="phase(machine, now) === 'export_only'" class="retention-note">
        原环境保留至
        {{ date(machine.expiresAt + 3 * 86400000, true) }}，不开放完整桌面。
      </p>
    </article>
  </div>
  <EmptyState
    v-else
    :title="search ? '没有找到匹配电脑' : '还没有分配给你的电脑'"
    :description="
      search
        ? '试试电脑名称、编号或地区。'
        : isMain
          ? '可以从团队资源分配一台，或选购新的电脑。'
          : '请联系团队主账号，为你分配一台独享电脑。'
    "
    icon="monitor"
    ><button v-if="isMain" class="button primary" @click="tab = 'team'">
      查看团队资源
    </button></EmptyState
  >
  <div class="info-banner">
    <span class="info-icon"><Icon name="lock" :size="20" /></span>
    <div>
      <strong>独享连接，按电脑租期使用</strong>
      <p>
        AI 权益单独显示有效期；未购买或到期的 AI
        不影响仍有效的电脑。断开连接不停止远端任务。
      </p>
    </div>
    <a class="text-link" href="#tickets"
      >服务支持 <Icon name="arrowUp" :size="14"
    /></a>
  </div>
</template>
