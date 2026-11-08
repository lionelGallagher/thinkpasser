<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "../../shared/Icon.vue";
import Status from "../../shared/Status.vue";
import EmptyState from "../../shared/EmptyState.vue";
import {
  state,
  simulatePayment,
  safely,
  askConfirm,
  deliverUnit,
  notify,
} from "../../shared/store";
import { AI_NAME, money, date } from "../../shared/models";
const props = defineProps<{ admin?: boolean }>();
const paymentChoices = ref<
  Record<string, "alipay" | "wechat" | "card" | "paypal">
>({});
const paymentMethods = [
  { id: "alipay", label: "支付宝", icon: "wallet" },
  { id: "wechat", label: "微信支付", icon: "link" },
  { id: "card", label: "国际银行卡", icon: "card" },
  { id: "paypal", label: "PayPal", icon: "globe" },
] as const;
const filter = ref("all"),
  search = ref("");
const orders = computed(() =>
  state.orders.filter(
    (o) =>
      (filter.value === "all" || o.state === filter.value) &&
      [o.id, o.productName]
        .join(" ")
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const labels: Record<string, string> = {
  awaiting_payment: "待付款",
  preparing: "准备中",
  delivered: "已交付",
  cancelled: "已取消",
};
const tone: Record<string, string> = {
  awaiting_payment: "amber",
  preparing: "blue",
  delivered: "green",
  cancelled: "neutral",
};
function cancel(id: string) {
  const o = state.orders.find((o) => o.id === id);
  if (o?.state === "awaiting_payment") {
    o.state = "cancelled";
    notify("未付款的演示订单已取消");
  }
}
</script>
<template>
  <section class="page-heading">
    <div>
      <h1>
        {{ admin ? "订单与交付" : "我的订单" }}
      </h1>
      <p>
        {{
          admin
            ? "逐套验收、逐套开放；付款、准备、交付和分配分别记录。"
            : "购买、准备、交付，每一个步骤都清晰可见。"
        }}
      </p>
    </div>
    <a class="button" :href="admin ? '#tasks' : '#marketplace'"
      ><Icon :name="admin ? 'package' : 'plus'" :size="16" />{{
        admin ? "查看供货任务" : "选购新电脑"
      }}</a
    >
  </section>
  <div class="filter-bar">
    <div class="segmented">
      <button
        v-for="item in [
          { id: 'all', label: '全部订单' },
          { id: 'awaiting_payment', label: '待付款' },
          { id: 'preparing', label: '准备中' },
          { id: 'delivered', label: '已交付' },
        ]"
        :key="item.id"
        :class="{ selected: filter === item.id }"
        @click="filter = item.id"
      >
        {{ item.label }}
      </button>
    </div>
    <label class="search-field"
      ><Icon name="search" :size="16" /><input
        v-model="search"
        placeholder="搜索订单或配置"
        aria-label="搜索订单"
    /></label>
  </div>
  <div class="order-list">
    <article v-for="order in orders" :key="order.id" class="panel order-card">
      <header class="order-top">
        <div>
          <span class="order-reference">{{ order.id }}</span
          ><span>{{ date(order.createdAt, true) }}</span>
        </div>
        <Status :tone="tone[order.state]">{{ labels[order.state] }}</Status>
      </header>
      <div class="order-body">
        <span class="device-tile"><Icon name="monitor" :size="25" /></span>
        <div class="order-description">
          <h2>{{ order.productName }}</h2>
          <p>
            {{
              order.type === "new"
                ? "新购电脑"
                : order.type === "renewal"
                  ? "电脑续费"
                  : "AI 加购"
            }}
            · {{ order.units.length }} 个交付单元
          </p>
          <div class="order-tool-row">
            <span
              v-for="ai in order.units[0]?.ai"
              :key="ai"
              class="tool-tag"
              :class="ai"
              >{{ ai === "claude" ? "✳" : "⌘" }} {{ AI_NAME[ai] }}</span
            ><span v-if="!order.units[0]?.ai.length" class="small-muted"
              >纯电脑</span
            >
          </div>
        </div>
        <div class="order-amount">
          <small>演示订单金额</small
          ><strong>{{ money(order.amountMinor) }}</strong
          ><span>人民币 CNY</span>
        </div>
      </div>
      <div
        v-if="order.state === 'awaiting_payment' && !admin"
        class="payment-methods"
      >
        <p>选择演示付款方式 <span>真实渠道尚未接入</span></p>
        <div>
          <button
            v-for="method in paymentMethods"
            :key="method.id"
            :class="{
              selected: (paymentChoices[order.id] || 'alipay') === method.id,
            }"
            @click="paymentChoices[order.id] = method.id"
          >
            <Icon :name="method.icon" :size="16" />{{ method.label
            }}<Icon
              v-if="(paymentChoices[order.id] || 'alipay') === method.id"
              name="check"
              :size="13"
            />
          </button>
        </div>
      </div>
      <div v-if="order.state === 'preparing' || admin" class="unit-list">
        <div v-for="unit in order.units" :key="unit.id" class="unit-row">
          <span
            ><Icon name="package" :size="16" />{{
              state.machines.find((m) => m.id === unit.machineId)?.code ||
              "待准备资源"
            }}</span
          >
          <div class="unit-progress">
            <span :class="{ done: true }">付款</span><i></i
            ><span
              :class="{
                done: unit.state === 'ready' || unit.state === 'delivered',
              }"
              >整套验收</span
            ><i></i
            ><span :class="{ done: unit.state === 'delivered' }">开放起租</span>
          </div>
          <button
            v-if="admin && unit.state === 'ready'"
            class="button small primary"
            @click="safely(() => deliverUnit(order.id, unit.id))"
          >
            演示交付</button
          ><Status
            v-else
            :tone="
              unit.state === 'delivered'
                ? 'green'
                : unit.state === 'ready'
                  ? 'blue'
                  : 'amber'
            "
            >{{
              unit.state === "delivered"
                ? "已交付"
                : unit.state === "ready"
                  ? "待开放"
                  : "等待验收"
            }}</Status
          >
        </div>
      </div>
      <footer class="order-bottom">
        <span
          ><Icon name="shield" :size="14" />{{
            order.state === "preparing"
              ? "准备阶段不消耗首次电脑租期"
              : order.state === "delivered"
                ? "正常已交付服务：主动闲置或换购不退不抵"
                : "以实际收款及交付记录为准"
          }}</span
        >
        <div>
          <button
            v-if="order.state === 'awaiting_payment' && !admin"
            class="text-link muted"
            @click="
              askConfirm('取消尚未付款的演示订单？', () => cancel(order.id))
            "
          >
            取消订单</button
          ><button
            v-if="order.state === 'awaiting_payment' && !admin"
            class="button primary small"
            @click="
              askConfirm(
                '模拟此订单收到付款结果？只修改本地演示状态，不会扣款。',
                () =>
                  safely(() =>
                    simulatePayment(
                      order.id,
                      paymentChoices[order.id] || 'alipay',
                    ),
                  ),
              )
            "
          >
            模拟付款结果 <Icon name="arrowRight" :size="14" /></button
          ><a
            v-else-if="order.state === 'preparing'"
            class="text-link"
            :href="admin ? '#tasks' : '#tickets'"
            >{{ admin ? "查看准备任务" : "咨询准备进度"
            }}<Icon name="arrowUp" :size="14" /></a
          ><a
            v-else-if="order.state === 'delivered'"
            href="#machines"
            class="text-link"
            v-show="!admin"
            >查看电脑 <Icon name="arrowRight" :size="14"
          /></a>
        </div>
      </footer>
    </article>
  </div>
  <EmptyState
    v-if="!orders.length"
    title="还没有符合条件的订单"
    description="新订单创建后，会在这里显示付款和交付进度。"
    icon="orders"
  />
</template>
