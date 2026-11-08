<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "../../shared/Icon.vue";
import Status from "../../shared/Status.vue";
import EmptyState from "../../shared/EmptyState.vue";
import {
  state,
  isMain,
  currentAccount,
  openDialog,
  updateTicket,
  safely,
} from "../../shared/store";
import { AI_NAME, date } from "../../shared/models";
const props = defineProps<{ admin?: boolean }>(),
  filter = ref("all");
const tickets = computed(() =>
  state.tickets.filter(
    (t) =>
      (props.admin ||
        isMain.value ||
        t.reporterId === currentAccount.value.id) &&
      (filter.value === "all" || t.state === filter.value),
  ),
);
</script>
<template>
  <section class="page-heading">
    <div>
      <h1>
        {{ admin ? "售后工单" : "服务工单" }}
      </h1>
      <p>
        {{
          admin
            ? "核实故障区间、安排修复，再按规则执行补时或退款。"
            : "描述你遇到的问题，我们会在工单里持续跟进。"
        }}
      </p>
    </div>
    <button v-if="!admin" class="button primary" @click="openDialog('ticket')">
      <Icon name="plus" :size="17" />提交工单
    </button>
  </section>
  <div class="filter-bar">
    <div class="segmented">
      <button
        v-for="item in [
          { id: 'all', label: '全部工单' },
          { id: 'open', label: '待受理' },
          { id: 'repairing', label: '处理中' },
          { id: 'resolved', label: '已完成' },
        ]"
        :key="item.id"
        :class="{ selected: filter === item.id }"
        @click="filter = item.id"
      >
        {{ item.label }}
      </button>
    </div>
    <span class="small-muted">共 {{ tickets.length }} 条记录</span>
  </div>
  <section v-for="ticket in tickets" :key="ticket.id" class="panel ticket-card">
    <div class="ticket-top">
      <div>
        <span class="ticket-reference">{{ ticket.id }}</span
        ><Status
          :tone="
            ticket.state === 'resolved'
              ? 'green'
              : ticket.state === 'repairing'
                ? 'blue'
                : 'amber'
          "
          >{{
            ticket.state === "resolved"
              ? "已完成"
              : ticket.state === "repairing"
                ? "处理中"
                : "待受理"
          }}</Status
        >
      </div>
      <time>{{ date(ticket.createdAt, true) }}</time>
    </div>
    <h2>
      {{
        ticket.kind === "computer_fault"
          ? "电脑连接或环境问题"
          : AI_NAME[ticket.provider || "claude"] + " 权益问题"
      }}
    </h2>
    <p class="ticket-description">{{ ticket.description }}</p>
    <div class="ticket-device">
      <Icon name="monitor" :size="15" />{{
        state.machines.find((m) => m.id === ticket.machineId)?.code
      }}<span
        >提交人：{{
          state.members.find((m) => m.id === ticket.reporterId)?.name
        }}</span
      >
    </div>
    <div class="ticket-response">
      <span class="brand-mini">T</span>
      <div>
        <strong>Thinkpasser 服务支持</strong>
        <p>
          {{
            ticket.decision ||
            "已收到问题，我们将核实相关状态和故障区间。修复进度与处理方案会记录在此工单。"
          }}
        </p>
      </div>
    </div>
    <div v-if="admin && ticket.state !== 'resolved'" class="ticket-actions">
      <button
        class="button"
        @click="safely(() => updateTicket(ticket.id, false))"
      >
        受理并跟进</button
      ><button
        class="button primary"
        @click="safely(() => updateTicket(ticket.id, true))"
      >
        记录演示处理结果
      </button>
    </div>
  </section>
  <EmptyState
    v-if="!tickets.length"
    title="目前没有符合条件的工单"
    description="需要帮助时，提交问题和相关电脑信息即可。"
    icon="help"
  />
  <div class="two-notes">
    <div>
      <Icon name="clock" :size="21" />
      <h3>给修复留出处理时间</h3>
      <p>AI 单独故障先安排修复；未在承诺处理窗口恢复，再按核实结果处理退款。</p>
    </div>
    <div>
      <Icon name="calendar" :size="21" />
      <h3>补时和 AI 截止分别计算</h3>
      <p>电脑补时不会自动延长 AI。实际赔付需客户工单、核实区间及原订单金额。</p>
    </div>
  </div>
</template>
