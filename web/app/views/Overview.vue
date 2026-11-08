<script setup lang="ts">
import { useNow } from "../../shared/useNow";
const now = useNow();
import { computed } from "vue";
import Icon from "../../shared/Icon.vue";
import Status from "../../shared/Status.vue";
import {
  state,
  currentAccount,
  myMachines,
  isMain,
  openDesktop,
  safely,
  openDialog,
  downloadExport,
} from "../../shared/store";
import {
  phase,
  remaining,
  date,
  COUNTRY,
  canConnect,
} from "../../shared/models";
const tickets = computed(() =>
  state.tickets.filter(
    (t) =>
      t.state !== "resolved" &&
      (isMain.value || t.reporterId === currentAccount.value.id),
  ),
);
const pendingOrders = computed(() =>
  isMain.value
    ? state.orders.filter(
        (o) => o.state === "preparing" || o.state === "awaiting_payment",
      )
    : [],
);
</script>
<template>
  <section class="page-heading">
    <div>
      <h1>我的电脑</h1>
      <p>{{ currentAccount.name }} · {{ isMain ? "主账号" : "子账号" }}</p>
    </div>
    <a v-if="isMain" class="button primary" href="#marketplace"
      ><Icon name="plus" :size="16" />添加电脑</a
    >
  </section>
  <section class="workspace-devices">
    <article
      v-for="machine in myMachines"
      :key="machine.id"
      class="primary-device"
    >
      <div class="primary-device-heading">
        <Icon name="monitor" :size="30" /><Status
          :tone="canConnect(machine, currentAccount, now) ? 'green' : 'amber'"
          >{{
            canConnect(machine, currentAccount, now)
              ? "可连接"
              : phase(machine, now) === "export_only"
                ? "已到期 · 可导出"
                : "暂不可连接"
          }}</Status
        >
      </div>
      <h2>{{ machine.name }}</h2>
      <p class="device-reference">
        {{ machine.code }} · {{ COUNTRY[machine.country]?.label }} /
        {{ machine.region }}
      </p>
      <dl class="device-key-specs">
        <div>
          <dt>处理器</dt>
          <dd>{{ machine.cpu }}</dd>
        </div>
        <div>
          <dt>内存</dt>
          <dd>{{ machine.memory }} GB</dd>
        </div>
        <div>
          <dt>存储</dt>
          <dd>{{ machine.disk }} GB</dd>
        </div>
        <div>
          <dt>剩余时间</dt>
          <dd>{{ remaining(machine.expiresAt) }}</dd>
        </div>
      </dl>
      <div class="primary-device-actions">
        <button
          v-if="phase(machine, now) === 'export_only'"
          class="button primary"
          @click="safely(() => downloadExport(machine.id))"
        >
          <Icon name="download" :size="16" />导出文件清单</button
        ><button
          v-else
          class="button primary"
          :disabled="!canConnect(machine, currentAccount, now)"
          @click="safely(() => openDesktop(machine.id))"
        >
          连接电脑 <Icon name="arrowUp" :size="16" /></button
        ><button class="button" @click="openDialog('detail', machine.id)">
          管理
        </button>
      </div>
      <p class="device-expiry">{{ date(machine.expiresAt, true) }} 到期</p>
    </article>
    <div v-if="!myMachines.length" class="empty-state">
      <Icon name="monitor" :size="32" />
      <h2>暂无分配给你的电脑</h2>
      <p>
        {{
          isMain
            ? "从团队资源分配一台，或添加新电脑。"
            : "请联系主账号分配电脑。"
        }}
      </p>
      <a v-if="isMain" class="button primary" href="#machines">查看团队资源</a>
    </div>
  </section>
  <section
    v-if="pendingOrders.length || tickets.length"
    class="workspace-pending"
  >
    <h2>待处理</h2>
    <a
      v-for="order in pendingOrders.slice(0, 3)"
      :key="order.id"
      href="#orders"
      class="work-row"
      ><Icon name="orders" :size="17" /><span
        ><strong>{{ order.productName }}</strong
        ><small>{{ order.id }}</small></span
      ><Status :tone="order.state === 'awaiting_payment' ? 'amber' : 'blue'">{{
        order.state === "awaiting_payment" ? "待付款" : "准备中"
      }}</Status
      ><Icon name="chevronRight" :size="16" /></a
    ><a
      v-for="ticket in tickets.slice(0, 3)"
      :key="ticket.id"
      href="#tickets"
      class="work-row"
      ><Icon name="help" :size="17" /><span
        ><strong>{{
          ticket.kind === "ai_fault" ? "AI 权益检查" : "电脑故障"
        }}</strong
        ><small>{{ ticket.id }}</small></span
      ><Status tone="neutral">{{
        ticket.state === "repairing" ? "处理中" : "待受理"
      }}</Status
      ><Icon name="chevronRight" :size="16"
    /></a>
  </section>
</template>
