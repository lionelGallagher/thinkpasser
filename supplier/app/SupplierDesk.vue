<script setup lang="ts">
import { computed } from "vue";
import Icon from "../../web/shared/Icon.vue";
import Status from "../../web/shared/Status.vue";
import TaskTable from "../../web/shared/TaskTable.vue";
import EmptyState from "../../web/shared/EmptyState.vue";
import SubscriptionResources from "../../web/shared/SubscriptionResources.vue";
import { state, ui, openDialog } from "../../web/shared/store";
import { AI_NAME, money, COUNTRY } from "../../web/shared/models";
defineProps<{ page: string }>();
const supplier = computed(
  () => state.suppliers.find((s) => s.id === ui.supplierId)!,
);
const tasks = computed(() =>
  state.tasks.filter((t) => t.supplierId === ui.supplierId),
);
const resources = computed(() =>
  state.machines.filter((m) => m.supplierId === ui.supplierId),
);
</script>
<template>
  <section class="page-heading">
    <div>
      <p class="eyebrow">PARTNER WORKSPACE</p>
      <h1>
        {{
          page === "overview"
            ? "每一次交付，都值得认真"
            : page === "resources"
              ? "我的供货资源"
              : page === "tasks"
                ? "供货任务"
                : page === "settlement"
                  ? "结算记录"
                  : "供应商资料"
        }}<span class="greeting-dot">.</span>
      </h1>
      <p>统一接单、准备、回报与结算，让合作更清晰。</p>
    </div>
    <label class="select-wrap supplier-select"
      ><Icon name="users" :size="17" /><select
        v-model="ui.supplierId"
        aria-label="切换演示供应商"
      >
        <option v-for="s in state.suppliers" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select></label
    >
  </section>
  <div v-if="supplier.state !== 'approved'" class="inline-note warning">
    <Icon name="alert" :size="17" />当前演示供方{{
      supplier.state === "applied" ? "等待审核" : "已暂停新供货"
    }}，通过平台审核后才能登记和接取新任务。
  </div>
  <template v-if="page === 'overview'"
    ><div class="partner-welcome">
      <div>
        <span class="small-overline">BUILD TOGETHER</span>
        <h2>{{ supplier.name }}，欢迎回来。</h2>
        <p>
          {{
            supplier.kind === "subscription"
              ? "卡／订阅侧能力，用于指定账号的开通和续订任务。"
              : "从可靠的机器开始，为每个用户交付可持续工作的环境。"
          }}
        </p>
        <a class="button primary" href="#tasks"
          >查看我的任务 <Icon name="arrowUp" :size="16"
        /></a>
      </div>
      <div class="partner-illustration" aria-hidden="true">
        <span class="partner-box"><Icon name="package" :size="65" /></span
        ><span class="floating-check"><Icon name="check" :size="21" /></span
        ><i></i><b>READY TO DELIVER</b>
      </div>
    </div>
    <div class="metrics-grid">
      <article
        v-for="metric in [
          {
            label: '待接任务',
            value: tasks.filter((t) => t.state === 'offered').length,
            suffix: '项',
            icon: 'package',
            tone: 'amber',
          },
          {
            label: '准备中',
            value: tasks.filter((t) => t.state === 'accepted').length,
            suffix: '项',
            icon: 'activity',
            tone: 'blue',
          },
          {
            label: '待验收',
            value: tasks.filter((t) => t.state === 'reported').length,
            suffix: '项',
            icon: 'shield',
            tone: 'purple',
          },
          {
            label: '已完成验收',
            value: tasks.filter((t) => t.state === 'verified').length,
            suffix: '项',
            icon: 'success',
            tone: 'green',
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
        <span class="metric-note">仅当前供方关联任务</span>
      </article>
    </div>
    <div class="section-heading">
      <h2>任务工作台</h2>
      <a class="text-link" href="#tasks"
        >全部任务 <Icon name="arrowRight" :size="14"
      /></a>
    </div>
    <TaskTable supplier
  /></template>
  <template v-else-if="page === 'tasks'"><TaskTable supplier /></template>
  <template v-else-if="page === 'resources'"
    ><SubscriptionResources v-if="supplier.kind !== 'computer'" />
    <div class="section-heading">
      <div>
        <h2>
          {{ supplier.kind === "subscription" ? "订阅侧供货能力" : "电脑资源" }}
        </h2>
        <p>资源登记不等于验收，交付能力需单独核对。</p>
      </div>
      <button
        v-if="supplier.kind !== 'subscription'"
        class="button primary"
        :disabled="supplier.state !== 'approved'"
        @click="openDialog('resource')"
      >
        <Icon name="plus" :size="16" />登记电脑
      </button>
    </div>
    <div v-if="supplier.kind === 'subscription'" class="subscription-resources">
      <article
        v-for="provider in ['claude', 'codex'] as const"
        :key="provider"
        class="panel subscription-resource"
      >
        <span class="large-ai" :class="provider">{{
          provider === "claude" ? "✳" : "⌘"
        }}</span>
        <div>
          <h2>{{ AI_NAME[provider] }} 开通与续订</h2>
          <p>按平台派发的指定邮箱处理，卡资源和真实订阅分别核验。</p>
          <div class="supplier-tags">
            <span class="tool-tag">指定账号</span
            ><span class="tool-tag">结果回报</span
            ><span class="tool-tag">实际期限核验</span>
          </div>
        </div>
        <Status tone="blue">演示能力</Status>
      </article>
    </div>
    <section v-else class="panel table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>资源</th>
            <th>配置与地区</th>
            <th>当前状态</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in resources" :key="m.id">
            <td>
              <div class="table-device">
                <span class="device-tile small"
                  ><Icon name="monitor" :size="20" /></span
                ><span
                  ><strong>{{ m.code }}</strong
                  ><small>{{ m.name }}</small></span
                >
              </div>
            </td>
            <td>
              {{ m.cpu }} · {{ m.memory }} GB<small class="table-small"
                >{{ COUNTRY[m.country]?.flag }} {{ m.region }}</small
              >
            </td>
            <td>
              <Status :tone="m.state === 'preparing' ? 'blue' : 'green'">{{
                m.state === "preparing" ? "准备／待验收" : "关联租约"
              }}</Status>
            </td>
            <td class="small-muted">供货归属不授予客户桌面权限</td>
          </tr>
        </tbody>
      </table>
      <EmptyState
        v-if="!resources.length"
        title="还没有登记资源"
        description="提交配置和机器引用，通过验收后再供货。"
        icon="server"
      />
    </section>
    <div class="inline-note">
      <Icon
        name="shield"
        :size="16"
      />卡自身的开卡、充值、冻结和销卡由供方管理；平台记录任务、结果和必要的脱敏资源关联。
    </div></template
  >
  <template v-else-if="page === 'settlement'"
    ><div class="finance-summary">
      <article>
        <span>演示已验收供货成本</span
        ><strong>{{
          money(
            tasks
              .filter((t) => t.state === "verified")
              .reduce((n, t) => n + t.costMinor, 0),
          )
        }}</strong>
        <p>仅展示当前供方任务</p>
      </article>
      <article>
        <span>待验收任务成本</span
        ><strong>{{
          money(
            tasks
              .filter((t) => t.state !== "verified")
              .reduce((n, t) => n + t.costMinor, 0),
          )
        }}</strong>
        <p>尚未构成已验收结算记录</p>
      </article>
      <article>
        <span>真实付款</span><strong class="finance-placeholder">未接入</strong>
        <p>演示不会执行资金转移</p>
      </article>
    </div>
    <TaskTable supplier
  /></template>
  <template v-else-if="page === 'settings'"
    ><section class="panel partner-profile">
      <div class="profile-summary">
        <span class="supplier-monogram">{{ supplier.name.slice(0, 1) }}</span>
        <h2>{{ supplier.name }}</h2>
        <p>{{ supplier.contact }}</p>
        <Status :tone="supplier.state === 'approved' ? 'green' : 'amber'">{{
          supplier.state === "approved" ? "已审核" : "待审核／暂停"
        }}</Status>
      </div>
      <dl class="detail-list">
        <div>
          <dt>供货角色</dt>
          <dd>
            {{
              supplier.kind === "computer"
                ? "电脑供应商"
                : supplier.kind === "subscription"
                  ? "卡／订阅供应商"
                  : "两类供货能力"
            }}
          </dd>
        </div>
        <div>
          <dt>自营属性</dt>
          <dd>{{ supplier.selfOperated ? "平台自营" : "外部合作" }}</dd>
        </div>
        <div>
          <dt>演示准备时限</dt>
          <dd>{{ supplier.leadHours }} 小时</dd>
        </div>
        <div>
          <dt>访问范围</dt>
          <dd>仅自身资源、任务与结算</dd>
        </div>
      </dl>
    </section></template
  >
</template>
