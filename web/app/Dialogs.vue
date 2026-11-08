<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BaseModal from "../shared/BaseModal.vue";
import Icon from "../shared/Icon.vue";
import Status from "../shared/Status.vue";
import { products } from "../shared/catalog";
import {
  state,
  ui,
  isMain,
  openDialog,
  closeDialog,
  createOrder,
  createMember,
  assign,
  createTicket,
  reportTask,
  registerResource,
  addSupplier,
  safely,
  notify,
  setAutoRenew,
  requestRestart,
  askConfirm,
  unassign,
} from "../shared/store";
import {
  AI_NAME,
  AI_PRICE,
  COUNTRY,
  DAY,
  money,
  date,
  remaining,
  phase,
  type AI,
  type Portal,
} from "../shared/models";
defineProps<{ portal: Portal }>();
const ai = ref<AI[]>([]),
  quantity = ref(1),
  email = ref(""),
  multipleEmails = ref(""),
  emailSource = ref("platform"),
  accepted = ref(false),
  name = ref(""),
  password = ref(""),
  memberId = ref(""),
  environment = ref<"preserve_files" | "reset">("preserve_files"),
  description = ref(""),
  faultKind = ref<"computer_fault" | "ai_fault">("computer_fault"),
  faultAi = ref<AI>("claude"),
  ticketMachine = ref(""),
  os = ref<"macos" | "windows">("macos"),
  country = ref("US"),
  supplierKind = ref<"computer" | "subscription" | "both">("computer");
const error = ref(""),
  busy = ref(false);
const machine = computed(() =>
  state.machines.find((m) => m.id === ui.targetId),
);
const product = computed(() => products.find((p) => p.id === ui.targetId));
const checkoutName = computed(() =>
  ui.mode === "new" ? product.value?.name : machine.value?.name,
);
const total = computed(
  () =>
    ((ui.mode === "new"
      ? product.value?.priceMinor || 0
      : ui.mode === "renewal"
        ? machine.value?.priceMinor || 0
        : 0) +
      ai.value.reduce((sum, a) => sum + AI_PRICE[a], 0)) *
    (ui.mode === "new" ? quantity.value : 1),
);
const checkoutTitle = computed(() =>
  ui.mode === "new"
    ? "准备你的新电脑"
    : ui.mode === "renewal"
      ? "续费这台电脑"
      : "为电脑加购 AI",
);
const relevantMembers = computed(() => state.members.filter((m) => m.enabled));
const actualUntil = computed(() =>
  ui.mode === "new"
    ? null
    : machine.value
      ? machine.value.expiresAt + (ui.mode === "renewal" ? 30 * DAY : 0)
      : null,
);
const ticketTargets = computed(() =>
  isMain.value
    ? state.machines.filter((m) => m.state !== "preparing")
    : state.machines.filter((m) => m.assignedTo === state.currentAccountId),
);
const faultMachine = computed(() =>
  state.machines.find((m) => m.id === ticketMachine.value),
);
const aiOptions = computed(() => [
  ...new Set(faultMachine.value?.ai.map((a) => a.provider) || []),
]);
watch(
  () => [ui.dialog, ui.targetId, ui.mode],
  () => {
    error.value = "";
    busy.value = false;
    accepted.value = false;
    quantity.value = 1;
    name.value = "";
    email.value = "";
    multipleEmails.value = "";
    password.value = "";
    description.value = "";
    memberId.value = machine.value?.assignedTo || "";
    environment.value = "preserve_files";
    emailSource.value = "platform";
    os.value = "macos";
    country.value = "US";
    faultKind.value = "computer_fault";
    ticketMachine.value =
      ui.targetId && state.machines.some((m) => m.id === ui.targetId)
        ? ui.targetId
        : ticketTargets.value[0]?.id || "";
    ai.value = [];
    if (ui.dialog === "checkout" && ui.mode === "new") {
      try {
        const selected = JSON.parse(
          sessionStorage.getItem("thinkpasser.selected-ai") || "[]",
        );
        ai.value = selected.filter((p: string) =>
          ["claude", "codex"].includes(p),
        );
      } catch {}
    }
    if (ui.dialog === "checkout" && ui.mode === "renewal")
      ai.value = [
        ...new Set(
          machine.value?.ai
            .filter(
              (a) => a.state === "available" && a.promisedUntil > Date.now(),
            )
            .map((a) => a.provider) || [],
        ),
      ];
  },
);
watch(ticketMachine, () => {
  faultAi.value = aiOptions.value[0] || "claude";
});
function unavailableAI(provider: AI) {
  return (
    ui.mode === "ai_addon" &&
    Boolean(
      machine.value?.ai.some(
        (a) =>
          a.provider === provider &&
          a.state !== "terminated" &&
          a.promisedUntil > Date.now(),
      ),
    )
  );
}
function submit(action: () => void) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    action();
    closeDialog();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "请检查填写内容";
    busy.value = false;
  }
}
function checkout() {
  if (!accepted.value) throw new Error("请先确认本次费用和实际服务期限");
  const count = ui.mode === "new" ? quantity.value : 1;
  const targetEmail = !ai.value.length
    ? ""
    : emailSource.value === "platform"
      ? Array.from(
          { length: count },
          () =>
            "workspace+" + crypto.randomUUID().slice(0, 8) + "@example.invalid",
        )
      : count === 1
        ? email.value
        : multipleEmails.value
            .split(/[\n,，;；]+/)
            .map((item) => item.trim())
            .filter(Boolean);
  const result = createOrder(
    product.value || null,
    ui.mode === "new" ? "" : ui.targetId,
    ui.mode,
    ai.value,
    quantity.value,
    targetEmail,
  );
  location.hash = "orders";
  notify("演示订单 " + result.orderId + " 已创建，尚未收款");
}
function createSub() {
  createMember(name.value, email.value, password.value);
}
</script>
<template>
  <BaseModal
    v-if="ui.dialog === 'checkout'"
    :title="checkoutTitle"
    wide
    @close="closeDialog"
    ><form class="checkout-layout" @submit.prevent="submit(checkout)">
      <div class="checkout-main">
        <div class="checkout-product">
          <span class="device-tile large"
            ><Icon name="monitor" :size="30"
          /></span>
          <div>
            <h3>{{ checkoutName }}</h3>
            <p>
              {{
                ui.mode === "new"
                  ? COUNTRY[product?.country || "US"]?.label
                  : machine?.region
              }}
              · {{ ui.mode === "new" ? product?.memory : machine?.memory }} GB /
              {{ ui.mode === "new" ? product?.disk : machine?.disk }} GB
            </p>
            <span>{{
              ui.mode === "new" ? "电脑基础周期 30 天" : machine?.code
            }}</span>
          </div>
        </div>
        <label v-if="ui.mode === 'new'" class="field"
          >购买数量
          <div class="stepper">
            <button
              type="button"
              aria-label="减少数量"
              :disabled="quantity <= 1"
              @click="quantity--"
            >
              −</button
            ><output>{{ quantity }}</output
            ><button
              type="button"
              aria-label="增加数量"
              :disabled="quantity >= 10"
              @click="quantity++"
            >
              +
            </button>
          </div></label
        >
        <div class="field-label-row">
          <label class="field-label">AI 工具搭配</label
          ><span>{{
            ui.mode === "ai_addon"
              ? "请选择需要加购的项目"
              : "可选，可同时选择两种"
          }}</span>
        </div>
        <label
          v-for="provider in ['claude', 'codex'] as AI[]"
          :key="provider"
          class="checkout-ai-option"
          :class="{
            selected: ai.includes(provider),
            disabled: unavailableAI(provider),
          }"
          ><input
            type="checkbox"
            v-model="ai"
            :value="provider"
            :disabled="unavailableAI(provider)"
          /><span class="large-ai" :class="provider">{{
            provider === "claude" ? "✳" : "⌘"
          }}</span
          ><span
            ><strong>{{ AI_NAME[provider] }}</strong
            ><small>{{
              unavailableAI(provider)
                ? "当前承诺期已购买，避免重复加购"
                : "指定账号开通 · 与此电脑关联"
            }}</small></span
          ><b
            >{{ money(AI_PRICE[provider]) }}<small>/ 标准30天</small></b
          ></label
        ><template v-if="ai.length"
          ><label class="field"
            >AI 开通邮箱来源<select v-model="emailSource">
              <option value="platform">由平台准备目标邮箱（演示）</option>
              <option value="customer">我提供指定邮箱</option>
            </select></label
          ><label
            v-if="
              emailSource === 'customer' &&
              (ui.mode !== 'new' || quantity === 1)
            "
            class="field"
            >指定邮箱<input
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
          /></label>
          <label
            v-if="
              emailSource === 'customer' && ui.mode === 'new' && quantity > 1
            "
            class="field"
            >每台电脑的指定邮箱<textarea
              v-model="multipleEmails"
              :rows="Math.min(quantity, 5)"
              placeholder="每行一个邮箱，数量与本次电脑台数一致"
              required
            ></textarea>
          </label>
          <p class="field-help">
            每台分别确认目标账号；供方按指定账号处理，可登录与订阅可用分别验收。
          </p></template
        >
        <div v-if="ui.mode === 'ai_addon'" class="duration-warning">
          <Icon name="clock" :size="19" />
          <div>
            <strong>按标准价收费，实际期限到电脑截止</strong>
            <p>
              当前电脑剩余 {{ remaining(machine?.expiresAt || 0) }}。本次 AI
              全额收费，截止
              {{
                actualUntil ? date(actualUntil, true) : "—"
              }}；正常开通等待补电脑时间，AI 本次截止不延长。
            </p>
          </div>
        </div>
      </div>
      <aside class="checkout-summary">
        <h3>这次准备，清楚明白</h3>
        <dl>
          <div v-if="ui.mode !== 'ai_addon'">
            <dt>电脑{{ ui.mode === "renewal" ? "续费" : "" }}</dt>
            <dd>
              {{
                money(
                  (ui.mode === "new"
                    ? product?.priceMinor
                    : machine?.priceMinor) || 0,
                )
              }}
            </dd>
          </div>
          <div v-for="provider in ai" :key="provider">
            <dt>{{ AI_NAME[provider] }}</dt>
            <dd>{{ money(AI_PRICE[provider]) }}</dd>
          </div>
          <div v-if="ui.mode === 'new'">
            <dt>数量</dt>
            <dd>{{ quantity }} 台</dd>
          </div>
        </dl>
        <div class="summary-total">
          <span>演示订单总额</span><strong>{{ money(total) }}</strong
          ><small>人民币 CNY · 不会产生真实扣款</small>
        </div>
        <ul class="summary-rules">
          <li>
            <Icon name="check" :size="14" />{{
              ui.mode === "new"
                ? "电脑与所选 AI 整套验收后起租"
                : "沿原电脑期限和既定续费规则处理"
            }}
          </li>
          <li>
            <Icon name="check" :size="14" />{{
              ui.mode === "new"
                ? "多台可以分批交付，各自计时"
                : actualUntil
                  ? "本次截止 " + date(actualUntil, true)
                  : "以服务端实际报价为准"
            }}
          </li>
          <li><Icon name="check" :size="14" />正常交付后，主动换购不退不抵</li>
        </ul>
        <label class="consent"
          ><input v-model="accepted" type="checkbox" required /><span
            >我已理解本次费用、实际服务期限及准备期取消规则。</span
          ></label
        >
        <p v-if="error" class="form-error" role="alert">
          <Icon name="alert" :size="15" />{{ error }}
        </p>
        <button class="button primary block" type="submit" :disabled="busy">
          创建演示订单 <Icon name="arrowRight" :size="16" />
        </button>
        <p class="checkout-footnote">
          创建后可在订单中模拟付款结果，继续查看准备与验收流程。
        </p>
      </aside>
    </form></BaseModal
  >
  <BaseModal
    v-else-if="ui.dialog === 'assign'"
    title="分配独享电脑"
    @close="closeDialog"
    ><form
      class="modal-form"
      @submit.prevent="submit(() => assign(ui.targetId, memberId, environment))"
    >
      <div class="selected-resource">
        <Icon name="monitor" :size="22" /><span
          ><strong>{{ machine?.name }}</strong
          ><small>{{ machine?.code }}</small></span
        >
      </div>
      <label class="field"
        >使用这台电脑的账号<select v-model="memberId" required>
          <option disabled value="">选择一个有效账号</option>
          <option
            v-for="member in relevantMembers"
            :key="member.id"
            :value="member.id"
            :disabled="
              state.machines.some(
                (m) =>
                  m.id !== ui.targetId &&
                  (m.assignedTo === member.id ||
                    m.pendingAssignmentTo === member.id),
              )
            "
          >
            {{ member.name }} · {{ member.role === "main" ? "主账号" : "子账号"
            }}{{
              state.machines.some(
                (m) =>
                  m.id !== ui.targetId &&
                  (m.assignedTo === member.id ||
                    m.pendingAssignmentTo === member.id),
              )
                ? "（已有电脑）"
                : ""
            }}
          </option>
        </select></label
      >
      <div class="field">
        <span>文件与软件环境</span
        ><label class="radio-option"
          ><input
            v-model="environment"
            type="radio"
            value="preserve_files"
          /><span
            ><strong>保留文件与软件</strong
            ><small>撤销旧授权、轮换远控凭据；私人登录另行处理。</small></span
          ></label
        ><label class="radio-option"
          ><input v-model="environment" type="radio" value="reset" /><span
            ><strong>恢复初始环境后分配</strong
            ><small>真实环境须完成清理与验收；此处仅演示选择。</small></span
          ></label
        >
      </div>
      <p class="field-help">
        每个账号同时最多一台电脑。主账号的管理权不自动等于桌面访问权。
      </p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="button" type="button" @click="closeDialog">取消</button
        ><button class="button primary" type="submit" :disabled="busy">
          确认演示分配
        </button>
      </div>
    </form></BaseModal
  >
  <BaseModal
    v-else-if="ui.dialog === 'member'"
    title="创建子账号"
    @close="closeDialog"
    ><form class="modal-form" @submit.prevent="submit(createSub)">
      <label class="field"
        >成员姓名<input
          v-model="name"
          placeholder="例如：林小满"
          required
          maxlength="30" /></label
      ><label class="field"
        >登录邮箱<input
          v-model="email"
          type="email"
          placeholder="member@example.com"
          required /></label
      ><label class="field"
        >初始密码<input
          v-model="password"
          type="password"
          placeholder="至少12位"
          minlength="12"
          required
          autocomplete="new-password"
      /></label>
      <div class="inline-note">
        <Icon
          name="lock"
          :size="16"
        />主账号设置初始密码，成员首次登录后修改。演示不保存密码。
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="button" type="button" @click="closeDialog">取消</button
        ><button class="button primary" type="submit" :disabled="busy">
          创建演示子账号
        </button>
      </div>
    </form></BaseModal
  >
  <BaseModal
    v-else-if="ui.dialog === 'ticket'"
    title="提交服务工单"
    @close="closeDialog"
    ><form
      class="modal-form"
      @submit.prevent="
        submit(() =>
          createTicket(
            ticketMachine,
            faultKind,
            faultKind === 'ai_fault' ? faultAi : undefined,
            description,
          ),
        )
      "
    >
      <label class="field"
        >相关电脑<select v-model="ticketMachine" required>
          <option disabled value="">选择电脑</option>
          <option v-for="m in ticketTargets" :key="m.id" :value="m.id">
            {{ m.code }} · {{ m.name }}
          </option>
        </select></label
      ><label class="field"
        >问题类型<select v-model="faultKind">
          <option value="computer_fault">电脑连接或环境问题</option>
          <option value="ai_fault">AI 权益问题</option>
        </select></label
      ><label v-if="faultKind === 'ai_fault'" class="field"
        >相关 AI<select v-model="faultAi" required>
          <option
            v-for="provider in aiOptions"
            :key="provider"
            :value="provider"
          >
            {{ AI_NAME[provider] }}
          </option>
        </select></label
      ><label class="field"
        >发生了什么？<textarea
          v-model="description"
          rows="4"
          placeholder="请描述问题现象、开始时间以及已经尝试的操作。"
          minlength="8"
          required
        ></textarea>
      </label>
      <p class="field-help">
        提交后先核实并安排处理；不会自动发放补时或执行退款。
      </p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="button" type="button" @click="closeDialog">取消</button
        ><button
          class="button primary"
          type="submit"
          :disabled="busy || !ticketMachine"
        >
          提交演示工单
        </button>
      </div>
    </form></BaseModal
  >
  <BaseModal
    v-else-if="ui.dialog === 'report'"
    title="回报供货结果"
    @close="closeDialog"
    ><form
      class="modal-form"
      @submit.prevent="submit(() => reportTask(ui.targetId, description))"
    >
      <p class="modal-description">
        任务 {{ ui.targetId }} · 回报后进入平台待验收，不能直接标记客户已可用。
      </p>
      <label class="field"
        >准备结果与验收说明<textarea
          v-model="description"
          rows="5"
          placeholder="填写配置、指定账号、实际期限及检查结果。此页面仅接收本地演示说明。"
          minlength="8"
          required
        ></textarea>
      </label>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="button" type="button" @click="closeDialog">取消</button
        ><button class="button primary" type="submit" :disabled="busy">
          提交演示结果
        </button>
      </div>
    </form></BaseModal
  >
  <BaseModal
    v-else-if="ui.dialog === 'resource'"
    title="登记电脑资源"
    @close="closeDialog"
    ><form
      class="modal-form"
      @submit.prevent="submit(() => registerResource(name, os, country))"
    >
      <label class="field"
        >供方机器编号<input
          v-model="name"
          placeholder="例如：TOKYO-MAC-008"
          required
          maxlength="60"
      /></label>
      <div class="form-grid">
        <label class="field"
          >操作系统<select v-model="os">
            <option value="macos">macOS</option>
            <option value="windows">Windows</option>
          </select></label
        ><label class="field"
          >资源地区<select v-model="country">
            <option v-for="(item, key) in COUNTRY" :key="key" :value="key">
              {{ item.label }}
            </option>
          </select></label
        >
      </div>
      <p class="field-help">
        演示使用所选系统的示例配置。正式资源需提交硬件、初始模板、维护与回收能力，并通过平台验收。
      </p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="button" type="button" @click="closeDialog">取消</button
        ><button class="button primary" type="submit" :disabled="busy">
          登记演示资源
        </button>
      </div>
    </form></BaseModal
  >
  <BaseModal
    v-else-if="ui.dialog === 'supplier'"
    title="创建供应商"
    @close="closeDialog"
    ><form
      class="modal-form"
      @submit.prevent="submit(() => addSupplier(name, email, supplierKind))"
    >
      <label class="field"
        >供应商名称<input
          v-model="name"
          placeholder="机构或团队名称"
          required
          maxlength="60" /></label
      ><label class="field"
        >联系邮箱<input
          v-model="email"
          type="email"
          placeholder="partner@example.com"
          required /></label
      ><label class="field"
        >供货能力<select v-model="supplierKind">
          <option value="computer">电脑供货</option>
          <option value="subscription">卡／订阅侧供货</option>
          <option value="both">同时具备两类能力</option>
        </select></label
      >
      <p class="field-help">
        建号后仍需审核；供货权限、资源验收与客户桌面访问分别管理。
      </p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="button" type="button" @click="closeDialog">取消</button
        ><button class="button primary" type="submit" :disabled="busy">
          创建演示供应商
        </button>
      </div>
    </form></BaseModal
  >
  <BaseModal
    v-else-if="ui.dialog === 'detail' && machine"
    :title="machine.name"
    @close="closeDialog"
    ><div class="modal-form">
      <dl class="detail-list">
        <div>
          <dt>电脑编号</dt>
          <dd>{{ machine.code }}</dd>
        </div>
        <div>
          <dt>系统与地区</dt>
          <dd>
            {{ machine.os === "macos" ? "macOS" : "Windows" }} ·
            {{ machine.region }}
          </dd>
        </div>
        <div>
          <dt>硬件配置</dt>
          <dd>
            {{ machine.cpu }} · {{ machine.memory }} GB · {{ machine.disk }} GB
          </dd>
        </div>
        <div>
          <dt>电脑截止</dt>
          <dd>
            {{
              machine.state === "preparing"
                ? "整套验收开放后起算"
                : date(machine.expiresAt, true)
            }}
          </dd>
        </div>
        <div>
          <dt>当前分配</dt>
          <dd>
            {{
              state.members.find((m) => m.id === machine?.assignedTo)?.name ||
              "尚未分配"
            }}
          </dd>
        </div>
        <div>
          <dt>远控连接密码</dt>
          <dd>每机独立管理，与平台登录密码分开</dd>
        </div>
        <div>
          <dt>凭据／租约版本</dt>
          <dd>
            v{{ machine.credentialVersion }} / v{{
              machine.leaseVersion
            }}（演示）
          </dd>
        </div>
        <div v-for="(item, index) in machine.ai" :key="index">
          <dt>{{ AI_NAME[item.provider] }}</dt>
          <dd>
            {{
              item.state === "preparing"
                ? "准备中"
                : date(item.promisedUntil, true) + " 截止"
            }}
            · {{ item.state }}
          </dd>
        </div>
      </dl>
      <div v-if="isMain && machine.state !== 'preparing'" class="setting-row">
        <div>
          <strong>自动续费偏好</strong>
          <p>真实自动扣款需要另行有效授权</p>
        </div>
        <label class="toggle"
          ><input
            type="checkbox"
            :checked="machine.autoRenew"
            aria-label="自动续费偏好"
            @change="
              safely(() =>
                setAutoRenew(
                  machine!.id,
                  ($event.target as HTMLInputElement).checked,
                ),
              )
            " /><span></span
        ></label>
      </div>
      <div class="modal-actions">
        <button
          v-if="isMain && phase(machine) === 'desktop'"
          class="button"
          @click="openDialog('assign', machine.id)"
        >
          调整分配</button
        ><button class="button primary" @click="closeDialog">知道了</button>
      </div>
    </div></BaseModal
  >
  <BaseModal
    v-else-if="ui.dialog === 'confirm'"
    title="请确认这次操作"
    @close="closeDialog"
    ><div class="modal-form">
      <p class="confirmation-copy">{{ ui.targetId }}</p>
      <div class="modal-actions">
        <button class="button" @click="closeDialog">暂不操作</button
        ><button
          class="button primary"
          @click="
            () => {
              const action = ui.confirmAction;
              closeDialog();
              if (action) safely(action);
            }
          "
        >
          确认
        </button>
      </div>
    </div></BaseModal
  >
</template>
