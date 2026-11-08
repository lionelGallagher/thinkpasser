<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "../../web/shared/Icon.vue";
import Status from "../../web/shared/Status.vue";
import TaskTable from "../../web/shared/TaskTable.vue";
import EmptyState from "../../web/shared/EmptyState.vue";
import SubscriptionResources from "../../web/shared/SubscriptionResources.vue";
import {
  state,
  openDialog,
  reviewSupplier,
  safely,
  askConfirm,
  requestRestart,
} from "../../web/shared/store";
import { phase, COUNTRY, money, date } from "../../web/shared/models";
const props = defineProps<{ page: string }>(),
  search = ref(""),
  resourceFilter = ref("all");
const machines = computed(() =>
  state.machines.filter(
    (m) =>
      [m.name, m.code, m.region]
        .join(" ")
        .toLowerCase()
        .includes(search.value.toLowerCase()) &&
      (resourceFilter.value === "all" ||
        (resourceFilter.value === "active" && phase(m) === "desktop") ||
        (resourceFilter.value === "preparing" && m.state === "preparing") ||
        (resourceFilter.value === "retained" && phase(m) === "export_only")),
  ),
);
const supplierKind = (kind: string) =>
  ({
    computer: "电脑供货",
    subscription: "卡／订阅供货",
    both: "电脑＋卡／订阅",
  })[kind];
const confirmedAmount = computed(() =>
  state.orders
    .filter((o) => ["preparing", "delivered"].includes(o.state))
    .reduce((n, o) => n + o.amountMinor, 0),
);
const verifiedCost = computed(() =>
  state.tasks
    .filter((t) => t.state === "verified")
    .reduce((n, t) => n + t.costMinor, 0),
);
const headings: Record<string, [string, string]> = {
  overview: ["运营总览", "从资源准备到客户交付，让每个状态有迹可循。"],
  resources: ["机器与资源", "纳管、验收、在租和回收，统一管理机器生命周期。"],
  suppliers: ["供应商管理", "电脑与卡／订阅两类供方，自营与合作统一管理。"],
  tasks: ["供货任务", "核对目标、供方和结果，按交付单元完成验收。"],
  finance: ["资金与结算", "客户收款、供货成本和售后支出分别记录。"],
  accounts: [
    "客户与账号",
    "查看主子账号和资源分配，管理身份不自动获得桌面权限。",
  ],
};
</script>
<template>
  <section class="page-heading">
    <div>
      <p class="eyebrow">THINKPASSER OPERATIONS</p>
      <h1>
        {{ headings[page]?.[0] || "运营总览"
        }}<span class="greeting-dot">.</span>
      </h1>
      <p>{{ headings[page]?.[1] }}</p>
    </div>
    <button
      v-if="page === 'suppliers'"
      class="button primary"
      @click="openDialog('supplier')"
    >
      <Icon name="plus" :size="17" />创建供应商</button
    ><span v-else class="heading-note"
      ><Icon name="shield" :size="15" />平台内部演示工作区</span
    >
  </section>
  <template v-if="page === 'overview'"
    ><div class="metrics-grid">
      <article
        v-for="metric in [
          {
            label: '纳管电脑',
            value: state.machines.length,
            suffix: '台',
            icon: 'server',
            note: 'Windows / macOS',
            tone: 'green',
          },
          {
            label: '待验收任务',
            value: state.tasks.filter((t) => t.state === 'reported').length,
            suffix: '项',
            icon: 'package',
            note: '供方回报不等于已交付',
            tone: 'blue',
          },
          {
            label: '待处理工单',
            value: state.tickets.filter((t) => t.state !== 'resolved').length,
            suffix: '条',
            icon: 'help',
            note: '核实事实，系统执行',
            tone: 'amber',
          },
          {
            label: '供应商',
            value: state.suppliers.length,
            suffix: '家',
            icon: 'users',
            note: '两类供货，自营与合作',
            tone: 'purple',
          },
        ]"
        :key="metric.label"
        class="metric-card"
      >
        <div>
          <span>{{ metric.label }}</span
          ><span class="metric-icon" :class="metric.tone"
            ><Icon :name="metric.icon"
          /></span>
        </div>
        <p>
          {{ metric.value }}<small>{{ metric.suffix }}</small>
        </p>
        <span class="metric-note">{{ metric.note }}</span>
      </article>
    </div>
    <div class="operations-grid">
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h2>交付流水线</h2>
            <p>按具体交付单元跟进，准备不消耗租期</p>
          </div>
          <a href="#orders" class="text-link"
            >全部订单 <Icon name="arrowRight" :size="14"
          /></a>
        </div>
        <div class="pipeline">
          <a
            v-for="step in [
              {
                label: '客户待付款',
                count: state.orders.filter(
                  (o) => o.state === 'awaiting_payment',
                ).length,
                icon: 'wallet',
                href: '#orders',
              },
              {
                label: '供货准备中',
                count: state.tasks.filter(
                  (t) => t.state === 'offered' || t.state === 'accepted',
                ).length,
                icon: 'server',
                href: '#tasks',
              },
              {
                label: '待平台验收',
                count: state.tasks.filter((t) => t.state === 'reported').length,
                icon: 'shield',
                href: '#tasks',
              },
              {
                label: '已完成交付',
                count: state.orders.filter((o) => o.state === 'delivered')
                  .length,
                icon: 'package',
                href: '#orders',
              },
            ]"
            :key="step.label"
            :href="step.href"
            ><span><Icon :name="step.icon" :size="19" /></span
            ><strong>{{ step.count }}</strong
            ><small>{{ step.label }}</small></a
          >
        </div>
      </section>
      <section class="panel attention-panel">
        <span class="small-overline">NEEDS ATTENTION</span>
        <h2>今天，先处理这些</h2>
        <a href="#tasks"
          ><span><i class="attention-dot purple"></i>供方结果待验收</span
          ><strong
            >{{ state.tasks.filter((t) => t.state === "reported").length }}
            <Icon name="chevronRight" :size="15" /></strong></a
        ><a href="#suppliers"
          ><span><i class="attention-dot amber"></i>新供应商待审核</span
          ><strong
            >{{ state.suppliers.filter((s) => s.state === "applied").length }}
            <Icon name="chevronRight" :size="15" /></strong></a
        ><a href="#resources"
          ><span><i class="attention-dot blue"></i>保留期电脑待跟进</span
          ><strong
            >{{
              state.machines.filter((m) => phase(m) === "export_only").length
            }}
            <Icon name="chevronRight" :size="15" /></strong
        ></a>
      </section>
    </div>
    <div class="section-heading">
      <h2>当前供货任务</h2>
      <a href="#tasks" class="text-link"
        >任务工作台 <Icon name="arrowUp" :size="14"
      /></a>
    </div>
    <TaskTable
  /></template>
  <template v-else-if="page === 'tasks'"><TaskTable /></template>
  <template v-else-if="page === 'resources'"
    ><SubscriptionResources admin />
    <div class="filter-bar">
      <div class="segmented">
        <button
          v-for="item in [
            { id: 'all', label: '全部资源' },
            { id: 'active', label: '有效租约' },
            { id: 'preparing', label: '准备／待验收' },
            { id: 'retained', label: '保留期' },
          ]"
          :key="item.id"
          :class="{ selected: resourceFilter === item.id }"
          @click="resourceFilter = item.id"
        >
          {{ item.label }}
        </button>
      </div>
      <label class="search-field"
        ><Icon name="search" :size="16" /><input
          v-model="search"
          placeholder="电脑编号、地区或配置"
          aria-label="搜索资源"
      /></label>
    </div>
    <section class="panel table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>电脑资源</th>
            <th>供方与地区</th>
            <th>分配与租约</th>
            <th>状态</th>
            <th>管理操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="machine in machines" :key="machine.id">
            <td>
              <div class="table-device">
                <span class="device-tile small" :class="machine.os"
                  ><Icon name="monitor" :size="21" /></span
                ><span
                  ><strong>{{ machine.name }}</strong
                  ><small
                    >{{ machine.code }} · {{ machine.memory }} GB /
                    {{ machine.disk }} GB</small
                  ></span
                >
              </div>
            </td>
            <td>
              {{ state.suppliers.find((s) => s.id === machine.supplierId)?.name
              }}<small class="table-small"
                >{{ COUNTRY[machine.country]?.flag }}
                {{ machine.region }}</small
              >
            </td>
            <td>
              {{
                state.members.find((a) => a.id === machine.assignedTo)?.name ||
                "尚未分配"
              }}<small class="table-small">{{
                machine.state === "preparing"
                  ? "等待验收开放"
                  : date(machine.expiresAt, true) + " 到期"
              }}</small>
            </td>
            <td>
              <Status
                :tone="
                  machine.state === 'preparing'
                    ? 'blue'
                    : phase(machine) === 'desktop'
                      ? 'green'
                      : 'amber'
                "
                >{{
                  machine.state === "preparing"
                    ? "准备／待验收"
                    : phase(machine) === "desktop"
                      ? "在租"
                      : "保留／待回收"
                }}</Status
              >
            </td>
            <td>
              <div class="table-actions">
                <button
                  class="text-link"
                  @click="openDialog('detail', machine.id)"
                >
                  资源详情</button
                ><button
                  class="text-link muted"
                  @click="
                    askConfirm(
                      '提交此机器的演示恢复请求？不会执行真实重启。',
                      () => safely(() => requestRestart(machine.id, true)),
                    )
                  "
                >
                  恢复请求
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState
        v-if="!machines.length"
        title="没有匹配的资源"
        description="调整筛选条件后重试。"
        icon="server"
      />
    </section>
    <div class="inline-note">
      <Icon
        name="alert"
        :size="16"
      />心跳、远控进程和真实桌面可达需分别验证；准备状态或未知执行结果不能直接回库。
    </div></template
  >
  <template v-else-if="page === 'suppliers'"
    ><div class="supplier-grid">
      <article
        v-for="supplier in state.suppliers"
        :key="supplier.id"
        class="panel supplier-card"
      >
        <div class="supplier-top">
          <span class="supplier-monogram">{{ supplier.name.slice(0, 1) }}</span
          ><Status
            :tone="
              supplier.state === 'approved'
                ? 'green'
                : supplier.state === 'applied'
                  ? 'amber'
                  : 'neutral'
            "
            >{{
              supplier.state === "approved"
                ? "已审核"
                : supplier.state === "applied"
                  ? "待审核"
                  : "已暂停"
            }}</Status
          >
        </div>
        <h2>{{ supplier.name }}</h2>
        <p>{{ supplier.contact }}</p>
        <div class="supplier-tags">
          <span class="tool-tag">{{ supplierKind(supplier.kind) }}</span
          ><span v-if="supplier.selfOperated" class="tool-tag self"
            >平台自营</span
          >
        </div>
        <dl class="supplier-facts">
          <div>
            <dt>承诺准备时间</dt>
            <dd>约 {{ supplier.leadHours }} 小时</dd>
          </div>
          <div>
            <dt>关联供货任务</dt>
            <dd>
              {{
                state.tasks.filter((t) => t.supplierId === supplier.id).length
              }}
              项
            </dd>
          </div>
        </dl>
        <button
          class="button"
          :class="{ primary: supplier.state === 'applied' }"
          @click="
            askConfirm(
              (supplier.state === 'approved' ? '暂停' : '启用') +
                ' ' +
                supplier.name +
                ' 的演示供货权限？资源仍需分别验收。',
              () =>
                safely(() =>
                  reviewSupplier(supplier.id, supplier.state !== 'approved'),
                ),
            )
          "
        >
          {{ supplier.state === "approved" ? "暂停新供货" : "审核并启用"
          }}<Icon name="arrowRight" :size="15" />
        </button>
      </article>
    </div>
    <div class="info-banner">
      <Icon name="shield" :size="23" />
      <div>
        <strong>身份审核与资源验收，分别进行</strong>
        <p>
          供方审核通过只代表获得供货资格，不代表每台电脑或每种开通能力已经就绪。
        </p>
      </div>
    </div></template
  >
  <template v-else-if="page === 'finance'"
    ><div class="finance-summary">
      <article>
        <span>演示已确认订单金额</span
        ><strong>{{ money(confirmedAmount) }}</strong>
        <p>含准备中及已交付订单</p>
      </article>
      <article>
        <span>已验收供货成本</span><strong>{{ money(verifiedCost) }}</strong>
        <p>按任务验收记录汇总</p>
      </article>
      <article>
        <span>实际渠道与对账</span
        ><strong class="finance-placeholder">待接入</strong>
        <p>未发生真实收款、退款或结算</p>
      </article>
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>供货成本记录</h2>
          <p>客户收款与供方应付独立核算</p>
        </div>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>任务</th>
              <th>供应商</th>
              <th>演示成本</th>
              <th>验收状态</th>
              <th>资金执行</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in state.tasks" :key="task.id">
              <td>{{ task.id }}</td>
              <td>
                {{
                  state.suppliers.find((s) => s.id === task.supplierId)?.name
                }}
              </td>
              <td>{{ money(task.costMinor) }}</td>
              <td>
                <Status :tone="task.state === 'verified' ? 'green' : 'amber'">{{
                  task.state === "verified" ? "已验收" : "待验收"
                }}</Status>
              </td>
              <td class="small-muted">真实结算未接入</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section></template
  >
  <template v-else-if="page === 'accounts'"
    ><section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Studio 工作空间</h2>
          <p>示例客户主账号及旗下子账号</p>
        </div>
        <Status tone="blue">客户组织</Status>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>账号</th>
              <th>角色</th>
              <th>电脑分配</th>
              <th>登录状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in state.members" :key="member.id">
              <td>
                <strong>{{ member.name }}</strong
                ><small class="table-small">{{ member.email }}</small>
              </td>
              <td>{{ member.role === "main" ? "主账号" : "子账号" }}</td>
              <td>
                {{
                  state.machines.find((m) => m.assignedTo === member.id)
                    ?.code || "未分配"
                }}
              </td>
              <td>
                <Status :tone="member.enabled ? 'green' : 'neutral'">{{
                  member.enabled ? "有效" : "停用"
                }}</Status>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <div class="inline-note">
      <Icon name="shield" :size="16" />运营身份不自动获得客户桌面、文件或 AI
      账号凭据。
    </div></template
  >
  <EmptyState
    v-else
    title="请选择管理功能"
    description="通过侧栏进入资源、供方、任务和售后。"
    icon="overview"
  />
</template>
