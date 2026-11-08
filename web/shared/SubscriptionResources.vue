<script setup lang="ts">
import { computed, ref } from "vue";
import BaseModal from "./BaseModal.vue";
import Icon from "./Icon.vue";
import Status from "./Status.vue";
import EmptyState from "./EmptyState.vue";
import {
  state,
  ui,
  registerSubscriptionResource,
  verifySubscriptionResource,
  safely,
} from "./store";
import { AI_NAME, money, date, type AI } from "./models";
const props = defineProps<{ admin?: boolean }>();
const records = computed(() =>
  state.subscriptionResources.filter(
    (item) => props.admin || item.supplierId === ui.supplierId,
  ),
);
const supplier = computed(() =>
  state.suppliers.find((item) => item.id === ui.supplierId),
);
const show = ref(false),
  reference = ref(""),
  providers = ref<AI[]>([]),
  price = ref(280),
  capacity = ref(1),
  until = ref(""),
  error = ref("");
function submit() {
  error.value = "";
  try {
    registerSubscriptionResource(
      reference.value,
      supplier.value?.canActivateAi ? providers.value : [],
      Math.round(price.value * 100),
      capacity.value,
      new Date(until.value).getTime(),
    );
    show.value = false;
    reference.value = "";
    until.value = "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "请检查资源信息";
  }
}
</script>
<template>
  <section class="section-heading">
    <div>
      <h2>
        {{
          admin
            ? "供卡与开通资源"
            : supplier?.canActivateAi
              ? "开通服务资源"
              : "供卡资源"
        }}
      </h2>
      <p>记录脱敏供方引用与真实能力，资源不等于客户 AI 已开通。</p>
    </div>
    <button
      v-if="!admin"
      class="button primary"
      :disabled="supplier?.state !== 'approved'"
      @click="show = true"
    >
      <Icon name="plus" :size="16" />登记供货资源
    </button>
  </section>
  <section class="panel table-scroll">
    <table class="data-table">
      <thead>
        <tr>
          <th>供方资源引用</th>
          <th>资源用途</th>
          <th>演示供货报价</th>
          <th>可供量／有效期</th>
          <th>验收状态</th>
          <th v-if="admin">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in records" :key="record.id">
          <td>
            <strong>{{ record.externalRef }}</strong
            ><small class="table-small">{{
              state.suppliers.find((s) => s.id === record.supplierId)?.name
            }}</small>
          </td>
          <td>
            <span v-if="record.subtype === 'payment_card'" class="small-muted"
              >支付卡资源 · 不含账号开通</span
            >
            <span
              v-for="provider in record.providers"
              :key="provider"
              class="tool-tag"
              :class="provider"
              >{{ AI_NAME[provider] }}</span
            >
          </td>
          <td>
            {{ money(record.costMinor)
            }}<small class="table-small">CNY · 演示报价</small>
          </td>
          <td>
            {{ record.capacity }} 份<small class="table-small"
              >{{ date(record.validUntil, true) }} 前有效</small
            >
          </td>
          <td>
            <Status :tone="record.state === 'verified' ? 'green' : 'amber'">{{
              record.state === "verified" ? "演示已验收" : "待验收"
            }}</Status>
          </td>
          <td v-if="admin">
            <button
              v-if="record.state !== 'verified'"
              class="button small"
              @click="safely(() => verifySubscriptionResource(record.id))"
            >
              演示验收</button
            ><span v-else class="small-muted">验收记录已保存</span>
          </td>
        </tr>
      </tbody>
    </table>
    <EmptyState
      v-if="!records.length"
      title="还没有订阅侧资源"
      description="登记供方引用、支持服务、报价和有效期，再由平台验收。"
      icon="card"
    />
  </section>
  <div class="inline-note">
    <Icon
      name="lock"
      :size="16"
    />不填写完整卡号、CVV或第三方密码。可供量是供方报送的服务能力，不代表官方允许一张卡开通多少账号。
  </div>
  <BaseModal v-if="show" title="登记卡／订阅侧资源" @close="show = false"
    ><form class="modal-form" @submit.prevent="submit">
      <label class="field"
        >供方脱敏资源引用<input
          v-model="reference"
          placeholder="例如：SUPPLIER-SUB-001；不填写完整卡号"
          required
          maxlength="100"
      /></label>
      <div v-if="supplier?.canActivateAi" class="field">
        <span>可执行的开通服务</span
        ><label
          v-for="provider in ['claude', 'codex'] as AI[]"
          :key="provider"
          class="radio-option"
          ><input
            v-model="providers"
            type="checkbox"
            :value="provider"
          /><span>{{ AI_NAME[provider] }}</span></label
        >
      </div>
      <div class="form-grid">
        <label class="field"
          >每份演示报价 / 元<input
            v-model.number="price"
            type="number"
            min="0.01"
            step="0.01"
            required /></label
        ><label class="field"
          >当前可供量<input
            v-model.number="capacity"
            type="number"
            min="1"
            step="1"
            required
        /></label>
      </div>
      <label class="field"
        >供方承诺有效至<input v-model="until" type="datetime-local" required
      /></label>
      <p class="field-help">
        真实开卡、充值、冻结和销卡由供方管理；此表单仅登记资源与供货能力。
      </p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button type="button" class="button" @click="show = false">取消</button
        ><button class="button primary" type="submit">登记演示订阅资源</button>
      </div>
    </form></BaseModal
  >
</template>
