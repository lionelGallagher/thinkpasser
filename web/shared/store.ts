import { computed, reactive, watch } from "vue";
import { products, resetCatalog } from "./catalog";
import {
  AI_PRICE,
  AI_NAME,
  DAY,
  canConnect,
  canExport,
  occupiesAccount,
  phase,
  type AI,
  type DemoState,
  type Machine,
  type Product,
  type Portal,
} from "./models";
export const STORAGE_KEY = "thinkpasser.interactive-demo.v3";
const id = (prefix: string) => prefix + "-" + crypto.randomUUID().slice(0, 8);
function initialState(
  workspaceKind: DemoState["workspaceKind"] = "personal",
): DemoState {
  const now = Date.now();
  const machine = (
    pid: string,
    mid: string,
    code: string,
    assignedTo: string | null,
    days: number,
    ai: AI[],
  ): Machine => {
    const p = products.find((p) => p.id === pid)!;
    return {
      id: mid,
      code,
      name: p.name,
      os: p.os,
      country: p.country,
      region: p.region,
      cpu: p.cpu,
      memory: p.memory,
      disk: p.disk,
      leaseStart: now - (30 - days) * DAY,
      expiresAt: now + days * DAY,
      assignedTo,
      exportOwnerId: assignedTo,
      customerOwned: true,
      pendingAssignmentTo: null,
      waitIntervals: [],
      state: "online",
      ai: ai.map((provider) => ({
        id: "ai-" + mid + "-" + provider,
        orderId:
          mid === "m-01"
            ? "TP-20261108-001"
            : mid === "m-05"
              ? "TP-20261108-002"
              : "seed-" + mid,
        unitId:
          mid === "m-01" ? "u-01" : mid === "m-05" ? "u-05" : "seed-" + mid,
        provider,
        targetEmail:
          mid === "m-05"
            ? "workspace@example.invalid"
            : "workspace-" + mid + "@example.invalid",
        state: "available",
        promisedFrom: now - 10 * DAY,
        promisedUntil: now + days * DAY,
        paidMinor: AI_PRICE[provider],
      })),
      priceMinor: p.priceMinor,
      credentialVersion: 1,
      leaseVersion: 1,
      autoRenew: false,
      supplierId: "s-compute",
    };
  };
  const machines = [
    machine("mac-us", "m-01", "TP-US-001", "a-main", 20, ["claude", "codex"]),
    machine("mac-jp", "m-02", "TP-JP-002", "a-lin", 12, ["claude"]),
    machine("win-us", "m-03", "TP-US-003", null, 26, []),
    machine("mac-sg", "m-04", "TP-SG-004", "a-chen", -1, ["codex"]),
    machine("win-de", "m-05", "TP-DE-005", null, 30, ["claude"]),
  ];
  machines[1]!.ai[0]!.state = "interrupted";
  machines[4]!.state = "preparing";
  machines[4]!.ai[0]!.state = "preparing";
  machines[4]!.ai[0]!.promisedFrom = 0;
  machines[4]!.ai[0]!.promisedUntil = 0;
  const initial: DemoState = {
    version: 3,
    workspaceKind,
    subscriptionResources: [
      {
        id: "sr-ai-01",
        subtype: "activation_service",
        supplierId: "s-activation",
        externalRef: "SELF-AI-001",
        providers: ["claude", "codex"],
        costMinor: 28000,
        currency: "CNY",
        capacity: 10,
        validUntil: now + 35 * DAY,
        state: "verified",
      },
      {
        id: "sr-01",
        subtype: "payment_card",
        supplierId: "s-subscription",
        externalRef: "NORTHSTAR-CARD-DEMO-01",
        providers: [],
        costMinor: 28000,
        currency: "CNY",
        capacity: 8,
        validUntil: now + 35 * DAY,
        state: "verified",
      },
    ],
    currentAccountId: "a-main",
    members: [
      {
        id: "a-main",
        name: "陈亦舟",
        email: "zhou@example.invalid",
        role: "main",
        enabled: true,
        firstLogin: false,
      },
      {
        id: "a-lin",
        name: "林小满",
        email: "lin@example.invalid",
        role: "sub",
        enabled: true,
        firstLogin: false,
      },
      {
        id: "a-chen",
        name: "周予安",
        email: "yuan@example.invalid",
        role: "sub",
        enabled: true,
        firstLogin: false,
      },
    ],
    machines,
    orders: [
      {
        id: "TP-20261108-001",
        createdAt: now - 10 * DAY,
        type: "new",
        state: "delivered",
        amountMinor: products[0]!.priceMinor + AI_PRICE.claude + AI_PRICE.codex,
        productName: "Mac mini · M4",
        units: [
          {
            id: "u-01",
            entitlementIds: ["ai-m-01-claude", "ai-m-01-codex"],
            machineId: "m-01",
            state: "delivered",
            ai: ["claude", "codex"],
          },
        ],
      },
      {
        id: "TP-20261108-002",
        createdAt: now - 2 * 3600000,
        type: "new",
        state: "preparing",
        amountMinor: products[4]!.priceMinor + AI_PRICE.claude,
        productName: "Windows 开发工作站",
        units: [
          {
            id: "u-05",
            entitlementIds: ["ai-m-05-claude"],
            machineId: "m-05",
            state: "preparing",
            ai: ["claude"],
          },
        ],
        aiEmail: "workspace@example.invalid",
      },
    ],
    suppliers: [
      {
        id: "s-activation",
        name: "Thinkpasser 开通执行",
        kind: "subscription",
        selfOperated: true,
        canActivateAi: true,
        state: "approved",
        contact: "activation@example.invalid",
        leadHours: 4,
      },
      {
        id: "s-compute",
        name: "Thinkpasser 自营",
        kind: "computer",
        selfOperated: true,
        state: "approved",
        contact: "compute@example.invalid",
        leadHours: 2,
      },
      {
        id: "s-subscription",
        name: "Northstar 卡经销商",
        canActivateAi: false,
        kind: "subscription",
        selfOperated: false,
        state: "approved",
        contact: "service@example.invalid",
        leadHours: 4,
      },
      {
        id: "s-tokyo",
        name: "Tokyo Compute",
        kind: "computer",
        selfOperated: false,
        state: "applied",
        contact: "hello@example.invalid",
        leadHours: 3,
      },
    ],
    tasks: [
      {
        id: "T-CARD-001",
        supplierId: "s-subscription",
        orderId: "PO-CARD-001",
        unitId: "procurement-card-001",
        machineId: "",
        kind: "card_supply",
        supplierResourceId: "sr-01",
        state: "offered",
        targetEmail: "",
        createdAt: now,
        deadline: now + 4 * 3600000,
        evidence: "",
        costMinor: 21000,
      },
      {
        id: "T-1001",
        supplierId: "s-compute",
        orderId: "TP-20261108-002",
        unitId: "u-05",
        machineId: "m-05",
        kind: "computer_prepare",
        state: "reported",
        targetEmail: "",
        createdAt: now - 2 * 3600000,
        deadline: now + 2 * 3600000,
        evidence: "演示资源检查记录：配置、初始环境、设备身份待平台验收。",
        costMinor: 18000,
      },
      {
        id: "T-1002",
        supplierId: "s-activation",
        entitlementId: "ai-m-05-claude",
        supplierResourceId: "sr-ai-01",
        orderId: "TP-20261108-002",
        unitId: "u-05",
        machineId: "m-05",
        kind: "claude",
        state: "accepted",
        targetEmail: "workspace@example.invalid",
        createdAt: now - 2 * 3600000,
        deadline: now + 2 * 3600000,
        evidence: "",
        costMinor: 28000,
      },
    ],
    tickets: [
      {
        id: "TK-1028",
        machineId: "m-02",
        reporterId: "a-lin",
        kind: "ai_fault",
        provider: "claude",
        description: "Claude Code 登录后提示订阅不可用，希望协助检查。",
        createdAt: now - 45 * 60000,
        state: "repairing",
      },
    ],
    activities: [
      {
        id: "ev-1",
        label: "电脑已交付",
        detail: "洛杉矶 · Mac mini M4，整套环境已在演示中就绪",
        at: now - 10 * DAY,
        tone: "green",
      },
      {
        id: "ev-2",
        label: "新订单准备中",
        detail: "法兰克福 · Windows 工作站，等待资源与 AI 验收",
        at: now - 2 * 3600000,
        tone: "blue",
      },
      {
        id: "ev-3",
        label: "服务工单已受理",
        detail: "TK-1028 · Claude Code 权益检查中",
        at: now - 45 * 60000,
        tone: "amber",
      },
    ],
  };
  if (workspaceKind === "personal") {
    initial.members = initial.members.slice(0, 1);
    initial.machines = initial.machines.slice(0, 1);
    initial.orders = initial.orders.slice(0, 1);
    initial.tasks = initial.tasks.filter((task) => task.kind === "card_supply");
    initial.tickets = [];
    initial.activities = initial.activities.slice(0, 1);
  }
  return initial;
}
function load(): DemoState {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value) {
      const data = JSON.parse(value);
      if (
        data.version === 3 &&
        ["personal", "team"].includes(data.workspaceKind) &&
        Array.isArray(data.members) &&
        Array.isArray(data.machines) &&
        Array.isArray(data.tasks) &&
        Array.isArray(data.orders) &&
        Array.isArray(data.suppliers) &&
        Array.isArray(data.activities) &&
        Array.isArray(data.tickets) &&
        Array.isArray(data.subscriptionResources) &&
        data.members.some((m: { id: string }) => m.id === data.currentAccountId)
      )
        return data;
    }
  } catch {}
  return initialState();
}
export const state = reactive<DemoState>(load());
watch(
  state,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {}
  },
  { deep: true },
);
export const currentAccount = computed(
  () => state.members.find((m) => m.id === state.currentAccountId)!,
);
export const myMachines = computed(() =>
  state.machines.filter(
    (m) =>
      (!isTeam.value &&
        currentAccount.value.role === "main" &&
        m.customerOwned !== false) ||
      m.assignedTo === currentAccount.value.id ||
      m.pendingAssignmentTo === currentAccount.value.id ||
      canExport(m, currentAccount.value),
  ),
);
export const isTeam = computed(() => state.workspaceKind === "team");
export const accountLabel = computed(() =>
  !isTeam.value
    ? "个人账号"
    : currentAccount.value.role === "main"
      ? "主账号"
      : "子账号",
);
export const isMain = computed(() => currentAccount.value.role === "main");
export const visibleMachines = computed(() =>
  isMain.value
    ? state.machines.filter((m) => m.customerOwned !== false)
    : myMachines.value,
);
export const ui = reactive({
  dialog: null as
    | null
    | "checkout"
    | "assign"
    | "member"
    | "ticket"
    | "confirm"
    | "resource"
    | "supplier"
    | "report"
    | "detail"
    | "auth",
  targetId: "",
  mode: "new" as "new" | "renewal" | "ai_addon",
  toast: "",
  toastTone: "green" as "green" | "red",
  sidebarOpen: false,
  activeMachineId: "",
  supplierId: "s-compute",
  confirmAction: null as null | (() => void),
});
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function notify(message: string, fail = false) {
  ui.toast = message;
  ui.toastTone = fail ? "red" : "green";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (ui.toast = ""), 4200);
}
export function safely(action: () => void) {
  try {
    action();
  } catch (error) {
    notify(error instanceof Error ? error.message : "操作未完成，请重试", true);
  }
}
export function openDialog(
  dialog: typeof ui.dialog,
  targetId = "",
  mode: typeof ui.mode = "new",
) {
  ui.targetId = targetId;
  ui.mode = mode;
  ui.dialog = dialog;
}
export function closeDialog() {
  ui.dialog = null;
  ui.confirmAction = null;
}
export function askConfirm(message: string, action: () => void) {
  ui.targetId = message;
  const actorId = state.currentAccountId;
  const workspaceKind = state.workspaceKind;
  ui.confirmAction = () => {
    if (
      state.currentAccountId !== actorId ||
      state.workspaceKind !== workspaceKind ||
      !currentAccount.value.enabled ||
      currentAccount.value.firstLogin
    )
      throw new Error("操作账号已变化，请重新确认");
    action();
  };
  ui.dialog = "confirm";
}
export function switchAccount(accountId: string) {
  const member = state.members.find((m) => m.id === accountId);
  if (!member?.enabled) throw new Error("该演示账号已停用");
  state.currentAccountId = accountId;
  ui.activeMachineId = "";
  ui.sidebarOpen = false;
  closeDialog();
  notify(
    "已切换到 " +
      member.name +
      " · " +
      (member.role === "main" ? "主账号" : "子账号"),
  );
  location.hash = "machines";
}
export function resetDemo(
  workspaceKind: DemoState["workspaceKind"] = state.workspaceKind,
) {
  resetCatalog();
  ui.supplierId = "s-compute";
  ui.sidebarOpen = false;
  Object.assign(state, initialState(workspaceKind));
  ui.activeMachineId = "";
  closeDialog();
  notify("演示数据已恢复");
}
function mainOnly() {
  if (
    !isMain.value ||
    !currentAccount.value.enabled ||
    currentAccount.value.firstLogin
  )
    throw new Error("此操作需要主账号");
}
function log(
  label: string,
  detail: string,
  tone: "green" | "blue" | "amber" = "green",
) {
  state.activities.unshift({
    id: id("event"),
    label,
    detail,
    at: Date.now(),
    tone,
  });
  state.activities = state.activities.slice(0, 30);
}
function getMachine(machineId: string) {
  const m = state.machines.find((m) => m.id === machineId);
  if (!m) throw new Error("电脑不存在");
  return m;
}
export function openDesktop(machineId: string) {
  const machine = getMachine(machineId);
  if (!canConnect(machine, currentAccount.value))
    throw new Error("当前账号没有这台电脑的有效桌面权限");
  ui.activeMachineId = machineId;
  location.hash = "desktop";
  notify("已打开桌面交互预览，未连接真实机器");
}
export function createMember(name: string, email: string, password: string) {
  mainOnly();
  if (!isTeam.value) throw new Error("请先开通团队空间，再创建子账号");
  if (!name.trim() || !email.includes("@") || password.length < 12)
    throw new Error("请填写姓名、有效邮箱和至少12位初始密码");
  if (state.members.some((m) => m.email.toLowerCase() === email.toLowerCase()))
    throw new Error("此邮箱已存在");
  state.members.push({
    id: id("account"),
    name: name.trim(),
    email: email.toLowerCase(),
    role: "sub",
    enabled: true,
    firstLogin: true,
  });
  log("创建了子账号", name + " · 首次登录需修改密码");
  notify("演示子账号已创建；初始密码未保存在浏览器");
}
export function assign(
  machineId: string,
  accountId: string,
  mode: "preserve_files" | "reset",
) {
  mainOnly();
  const m = getMachine(machineId),
    member = state.members.find((x) => x.id === accountId);
  if (!member?.enabled) throw new Error("请选择有效的账号");
  if (phase(m) !== "desktop" || m.state !== "online")
    throw new Error("电脑尚未交付、已到期或不可用");
  if (
    state.machines.some(
      (other) => other.id !== machineId && occupiesAccount(other, accountId),
    )
  )
    throw new Error("该账号已有一台电脑，请先收回原分配");
  if (m.assignedTo === accountId && mode === "preserve_files") return;
  m.assignedTo = null;
  m.pendingAssignmentTo = accountId;
  m.state = "resetting";
  m.leaseVersion++;
  ui.activeMachineId = "";
  log(
    "交接处理中",
    m.code +
      (mode === "reset"
        ? " · 等待重置及凭据验收"
        : " · 保留工作文件，等待私人登录及凭据验收"),
    "amber",
  );
  notify("已提交演示交接；验收前不向新使用者开放");
}
export function completeDemoHandoff(machineId: string) {
  const m = getMachine(machineId),
    target = state.members.find(
      (member) => member.id === m.pendingAssignmentTo,
    );
  if (m.state !== "resetting" || !target?.enabled || m.expiresAt <= Date.now())
    throw new Error("交接条件不满足，保持待核验");
  if (
    state.machines.some(
      (other) => other.id !== m.id && occupiesAccount(other, target.id),
    )
  )
    throw new Error("目标账号存在其他分配");
  m.assignedTo = target.id;
  m.exportOwnerId = target.id;
  m.pendingAssignmentTo = null;
  m.credentialVersion++;
  m.leaseVersion++;
  m.state = "online";
  notify("演示交接验收完成；未执行真实重装或凭据写入");
}
export function unassign(machineId: string) {
  mainOnly();
  const m = getMachine(machineId);
  if (m.state === "resetting") throw new Error("重置已开始，请先核验操作结果");
  m.exportOwnerId =
    phase(m) === "export_only" ? (m.exportOwnerId ?? m.assignedTo) : null;
  m.assignedTo = null;
  m.pendingAssignmentTo = null;
  m.credentialVersion++;
  m.leaseVersion++;
  ui.activeMachineId = "";
  log("电脑已收回", m.code + " · 文件环境保留，原授权撤销");
  notify("已收回演示分配，保留文件环境");
}
export function setAutoRenew(machineId: string, enabled: boolean) {
  mainOnly();
  getMachine(machineId).autoRenew = enabled;
  notify(
    enabled
      ? "已保存演示自动续费偏好；未建立真实代扣授权"
      : "已关闭演示自动续费",
  );
}
export function createOrder(
  product: Product | null,
  machineId: string,
  kind: "new" | "renewal" | "ai_addon",
  ai: AI[],
  quantity: number,
  email: string | string[],
): OrderResult {
  mainOnly();
  if (
    new Set(ai).size !== ai.length ||
    ai.some((provider) => !["claude", "codex"].includes(provider))
  )
    throw new Error("AI选择重复或无效");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
    throw new Error("请选择1到10台电脑");
  if (!isTeam.value && kind === "new" && quantity !== 1)
    throw new Error("个人空间每次购买一台；多人使用请开通团队空间");
  const unitCount = kind === "new" ? quantity : 1;
  const existing = machineId ? getMachine(machineId) : null;
  const needsTarget = ai.some(
    (provider) =>
      kind !== "renewal" || !existing || !knownAiEmail(existing, provider),
  );
  const targetEmails = Array.isArray(email)
    ? email.map((item) => item.trim())
    : [email.trim()];
  if (
    ai.length &&
    needsTarget &&
    (targetEmails.length !== unitCount ||
      targetEmails.some((item) => !item.includes("@")))
  )
    throw new Error("请为每台电脑分别提供本次AI开通的目标邮箱");
  if (
    ai.length &&
    needsTarget &&
    new Set(targetEmails.map((item) => item.toLowerCase())).size !==
      targetEmails.length
  )
    throw new Error("多台电脑请分别确认目标账号，不能自动共用同一订阅");
  if (kind === "new" && (!product || !product.available))
    throw new Error("此配置当前缺货");
  if (
    kind !== "new" &&
    (!existing || phase(existing) === "none" || existing.state === "preparing")
  )
    throw new Error("此电脑暂不能续费或加购");
  if (kind === "ai_addon") {
    if (!existing || phase(existing) !== "desktop")
      throw new Error("电脑到期后不能加购 AI");
    if (!ai.length) throw new Error("请选择至少一种 AI");
    for (const provider of ai)
      if (
        existing.ai.some(
          (a) =>
            a.provider === provider &&
            a.promisedUntil > Date.now() &&
            a.state !== "terminated",
        )
      )
        throw new Error(AI_NAME[provider] + " 已购买，请避免重复加购");
  }
  const base =
    kind === "new"
      ? product!.priceMinor
      : kind === "renewal"
        ? existing!.priceMinor
        : 0;
  const total =
    (base + ai.reduce((sum, a) => sum + AI_PRICE[a], 0)) *
    (kind === "new" ? quantity : 1);
  if (!Number.isSafeInteger(total) || total <= 0)
    throw new Error("报价金额超出可处理范围");
  const oid = id("TP"),
    units = Array.from(
      { length: kind === "new" ? quantity : 1 },
      (_, index) => ({
        id: id("unit"),
        entitlementIds: [],
        aiEmail: ai.length ? targetEmails[index] : undefined,
        aiEmails: Object.fromEntries(
          ai.map((provider) => [
            provider,
            kind === "renewal" && existing
              ? knownAiEmail(existing, provider) || targetEmails[index]
              : targetEmails[index],
          ]),
        ),
        machineId: existing?.id ?? "",
        state: "preparing" as const,
        ai: [...ai],
      }),
    );
  state.orders.unshift({
    id: oid,
    createdAt: Date.now(),
    type: kind,
    state: "awaiting_payment",
    amountMinor: total,
    productName: product?.name ?? existing!.name,
    productSnapshot: product ? { ...product } : undefined,
    quoteLeaseVersion: existing?.leaseVersion,
    quotedComputerUntil: existing?.expiresAt,
    units,
    aiEmail: targetEmails[0],
  });
  pendingProducts.set(oid, product?.id ?? "");
  try {
    localStorage.setItem("thinkpasser.quote." + oid, product?.id ?? "");
  } catch {}
  log("演示订单已创建", oid + " · 待演示支付", "blue");
  return { orderId: oid };
}
interface OrderResult {
  orderId: string;
}
const pendingProducts = new Map<string, string>();
export function simulatePayment(
  orderId: string,
  provider: "alipay" | "wechat" | "card" | "paypal" = "alipay",
) {
  mainOnly();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order || order.state !== "awaiting_payment")
    throw new Error("订单已处理，请刷新查看");
  const now = Date.now();
  if (order.type !== "new") {
    for (const unit of order.units) {
      const current = getMachine(unit.machineId);
      if (phase(current, now) === "none" || current.state === "resetting")
        throw new Error("此租约已不能恢复原环境");
      if (
        order.quoteLeaseVersion !== current.leaseVersion ||
        order.quotedComputerUntil !== current.expiresAt
      )
        throw new Error("电脑期限或状态已变化，旧报价失效，请重新确认后下单");
      if (order.type === "ai_addon") {
        if (phase(current, now) !== "desktop")
          throw new Error("电脑已到期，不能继续此AI加购");
        if (
          unit.ai.some((provider) =>
            current.ai.some(
              (item) =>
                item.provider === provider &&
                item.promisedUntil > now &&
                item.state !== "terminated",
            ),
          )
        )
          throw new Error("此AI已经购买，请勿重复提交");
      }
    }
  }
  for (const unit of order.units) {
    let m: Machine;
    if (order.type === "new") {
      const pid =
        pendingProducts.get(order.id) ||
        localStorage.getItem("thinkpasser.quote." + order.id);
      const p = order.productSnapshot || products.find((p) => p.id === pid);
      if (!p) throw new Error("演示报价已失效，请重新下单");
      m = {
        ...p,
        id: id("machine"),
        code:
          "TP-" +
          p.country +
          "-" +
          String(state.machines.length + 1).padStart(3, "0"),
        leaseStart: 0,
        expiresAt: 0,
        assignedTo: null,
        exportOwnerId: null,
        customerOwned: true,
        pendingAssignmentTo: null,
        waitIntervals: [],
        state: "preparing",
        ai: [],
        priceMinor: p.priceMinor,
        credentialVersion: 1,
        leaseVersion: 1,
        autoRenew: false,
        supplierId: "s-compute",
      };
      state.machines.push(m);
      unit.machineId = m.id;
    } else {
      m = getMachine(unit.machineId);
      if (order.type === "renewal") {
        if (phase(m) === "none" || m.state === "resetting")
          throw new Error("保留期已结束，不能恢复原环境");
        m.expiresAt += 30 * DAY;
        m.leaseVersion++;
      }
    }
    const promiseFrom = order.type === "renewal" ? m.expiresAt - 30 * DAY : now;
    for (const provider of unit.ai) {
      const entitlementId = id("ai");
      unit.entitlementIds.push(entitlementId);
      m.ai.push({
        id: entitlementId,
        orderId: order.id,
        unitId: unit.id,
        provider,
        targetEmail: unit.aiEmails?.[provider] ?? unit.aiEmail ?? order.aiEmail,
        state: "preparing",
        promisedFrom: promiseFrom,
        promisedUntil: order.type === "new" ? 0 : m.expiresAt,
        paidMinor: AI_PRICE[provider],
      });
    }
    const kinds: ("computer_prepare" | AI)[] =
      order.type === "new" ? ["computer_prepare", ...unit.ai] : [...unit.ai];
    for (const kind of kinds)
      state.tasks.unshift({
        id: id("T"),
        supplierId: kind === "computer_prepare" ? "s-compute" : "s-activation",
        orderId: order.id,
        unitId: unit.id,
        machineId: m.id,
        kind,
        entitlementId:
          kind === "computer_prepare"
            ? undefined
            : m.ai.find(
                (a) =>
                  a.orderId === order.id &&
                  a.unitId === unit.id &&
                  a.provider === kind,
              )?.id,
        supplierResourceId: kind === "computer_prepare" ? m.id : "sr-ai-01",
        state: "offered",
        targetEmail:
          kind === "computer_prepare"
            ? ""
            : (unit.aiEmails?.[kind] ?? unit.aiEmail ?? order.aiEmail ?? ""),
        createdAt: now,
        deadline: now + 4 * 3600000,
        evidence: "",
        costMinor:
          kind === "computer_prepare"
            ? Math.floor(m.priceMinor * 0.65)
            : Math.floor(AI_PRICE[kind] * 0.7),
      });
    if (!kinds.length) {
      unit.state = "delivered";
      order.state = "delivered";
    }
  }
  order.paidAt = now;
  order.paymentProvider = provider;
  if (order.state !== "delivered") order.state = "preparing";
  log("演示付款结果已确认", order.id + " · 仅本地模拟，未产生真实扣款", "blue");
  notify("演示订单进入准备阶段；未发生真实收款");
}
export function acceptTask(taskId: string) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.state !== "offered")
    throw new Error("此任务不是待接单状态");
  task.state = "accepted";
  notify("演示任务已接单");
}
export function reportTask(taskId: string, evidence: string) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.state !== "accepted") throw new Error("此任务暂不能回报");
  if (evidence.trim().length < 8)
    throw new Error("请填写至少8个字的准备结果和验收说明");
  task.state = "reported";
  task.evidence = evidence.trim();
  notify("演示结果已提交，等待平台验收");
}
export function verifyTask(taskId: string) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.state !== "reported" || !task.evidence)
    throw new Error("供方尚未提交可验收结果");
  task.state = "verified";
  const order = state.orders.find((o) => o.id === task.orderId);
  const unit = order?.units.find((u) => u.id === task.unitId);
  if (
    unit &&
    order &&
    unit.state === "preparing" &&
    order.state === "preparing"
  ) {
    const verified = state.tasks.filter(
      (t) =>
        t.orderId === order.id &&
        t.unitId === unit.id &&
        t.state === "verified",
    );
    const computerReady =
      order.type !== "new" ||
      verified.some((t) => t.kind === "computer_prepare");
    const aiReady =
      unit.entitlementIds.length === unit.ai.length &&
      unit.entitlementIds.every((entitlementId) =>
        verified.some((t) => t.entitlementId === entitlementId),
      );
    if (computerReady && aiReady) unit.state = "ready";
  }
  notify("演示验收已记录；真实服务仍需实际证据");
}
export function deliverUnit(orderId: string, unitId: string) {
  const order = state.orders.find((o) => o.id === orderId),
    unit = order?.units.find((u) => u.id === unitId);
  if (!order || !unit || unit.state !== "ready" || order.state !== "preparing")
    throw new Error("电脑及所购 AI 尚未全部验收");
  const m = getMachine(unit.machineId),
    now = Date.now();
  const entitlements = unit.entitlementIds.map((entitlementId) =>
    m.ai.find(
      (item) =>
        item.id === entitlementId &&
        item.orderId === order.id &&
        item.unitId === unit.id,
    ),
  );
  if (
    entitlements.length !== unit.ai.length ||
    entitlements.some((item) => !item || item.state !== "preparing")
  )
    throw new Error("本单元权益未完整匹配");
  if (
    order.type !== "new" &&
    entitlements.some((item) => item!.promisedUntil <= now)
  )
    throw new Error("原承诺期已结束，请处理该订单异常");
  if (order.type === "new") {
    m.state = "online";
    m.leaseStart = now;
    m.expiresAt = now + 30 * DAY;
  }
  for (const item of entitlements) {
    const ai = item!;
    if (order.type === "new") {
      ai.promisedFrom = now;
      ai.promisedUntil = m.expiresAt;
    }
    ai.state = "available";
  }
  if (order.type === "ai_addon") {
    const duration = (intervals: [number, number][]) => {
      const sorted = intervals
        .filter(([a, b]) => b > a)
        .sort((a, b) => a[0] - b[0]);
      let total = 0,
        left = 0,
        right = 0;
      for (const [a, b] of sorted) {
        if (!right) {
          left = a;
          right = b;
        } else if (a <= right) right = Math.max(right, b);
        else {
          total += right - left;
          left = a;
          right = b;
        }
      }
      return total + (right ? right - left : 0);
    };
    const previous = duration([...m.waitIntervals]);
    m.waitIntervals.push([order.paidAt ?? now, now]);
    const delta = duration([...m.waitIntervals]) - previous;
    if (delta > 0) {
      m.expiresAt += delta;
      m.leaseVersion++;
    }
  }
  if (
    !isTeam.value &&
    order.type === "new" &&
    !state.machines.some(
      (other) =>
        other.id !== m.id && occupiesAccount(other, state.currentAccountId),
    )
  ) {
    m.assignedTo = state.currentAccountId;
    m.exportOwnerId = state.currentAccountId;
    m.leaseVersion++;
  }
  unit.state = "delivered";
  if (order.units.every((u) => u.state === "delivered"))
    order.state = "delivered";
  log("演示交付已完成", m.code + " · 整套验收后起租");
  notify("演示单元已交付，已记录各自起租时间");
}
export function createTicket(
  machineId: string,
  kind: "computer_fault" | "ai_fault",
  provider: AI | undefined,
  description: string,
) {
  const m = getMachine(machineId);
  if (!currentAccount.value.enabled || currentAccount.value.firstLogin)
    throw new Error("请先完成账号验证");
  if (!isMain.value && m.assignedTo !== currentAccount.value.id)
    throw new Error("只能为自己的电脑提交工单");
  if (description.trim().length < 8)
    throw new Error("请描述至少8个字的故障现象");
  if (
    kind === "ai_fault" &&
    (!provider || !m.ai.some((a) => a.provider === provider))
  )
    throw new Error("请选择此电脑已经购买的 AI");
  state.tickets.unshift({
    id: id("TK"),
    machineId,
    reporterId: currentAccount.value.id,
    kind,
    provider,
    description: description.trim(),
    createdAt: Date.now(),
    state: "open",
  });
  log("演示工单已提交", m.code + " · 等待核实故障事实", "amber");
  notify("演示工单已提交，未自动发放补偿");
}
export function updateTicket(ticketId: string, resolve: boolean) {
  const t = state.tickets.find((t) => t.id === ticketId);
  if (!t) throw new Error("工单不存在");
  t.state = resolve ? "resolved" : "repairing";
  t.decision = resolve
    ? "演示处理记录：已完成故障检查；资金与补时需独立核定。"
    : "正在核实故障区间并安排维修。";
  notify(resolve ? "已保存演示处理结果" : "演示工单进入处理中");
}
export function reviewSupplier(supplierId: string, approve: boolean) {
  const s = state.suppliers.find((s) => s.id === supplierId);
  if (!s) throw new Error("供方不存在");
  s.state = approve ? "approved" : "suspended";
  notify(
    approve ? "演示供货权限已启用；资源仍需单独验收" : "演示供方已暂停新供货",
  );
}
export function registerResource(
  name: string,
  os: "macos" | "windows",
  country: string,
) {
  if (!name.trim()) throw new Error("请填写机器编号");
  const s = state.suppliers.find((s) => s.id === ui.supplierId);
  if (!s || s.state !== "approved" || s.kind === "subscription")
    throw new Error("当前供方没有电脑供货权限");
  const p = products.find((p) => p.os === os)!;
  state.machines.push({
    id: id("resource"),
    code: name.trim(),
    name: p.name,
    os,
    country,
    region: country === "JP" ? "东京" : country === "SG" ? "新加坡" : "洛杉矶",
    cpu: p.cpu,
    memory: p.memory,
    disk: p.disk,
    leaseStart: 0,
    expiresAt: 0,
    assignedTo: null,
    customerOwned: false,
    pendingAssignmentTo: null,
    waitIntervals: [],
    state: "preparing",
    ai: [],
    priceMinor: p.priceMinor,
    credentialVersion: 0,
    leaseVersion: 1,
    autoRenew: false,
    supplierId: s.id,
  });
  notify("演示资源已登记，等待平台验收");
}
export function addSupplier(
  name: string,
  email: string,
  kind: "computer" | "subscription" | "both",
) {
  if (!name.trim() || !email.includes("@"))
    throw new Error("请填写供应商名称和有效邮箱");
  state.suppliers.push({
    id: id("supplier"),
    name: name.trim(),
    contact: email,
    kind,
    selfOperated: false,
    state: "applied",
    leadHours: 4,
  });
  notify("演示供应商申请已创建，等待审核");
}
// Local demonstration only. Production operator identity must come from the admin login context.
export function requestRestart(machineId: string, internalOperator = false) {
  const m = getMachine(machineId);
  if (
    !internalOperator &&
    !isMain.value &&
    m.assignedTo !== currentAccount.value.id
  )
    throw new Error("不能操作他人的电脑");
  notify("已提交演示恢复请求；真实执行器未接入，不会重启机器");
  log("演示恢复请求", m.code + " · 实际操作未配置", "amber");
}
export function downloadExport(machineId: string) {
  const m = getMachine(machineId);
  if (!canExport(m, currentAccount.value))
    throw new Error("当前账号没有此电脑的保留期导出权限");
  const text =
    "Thinkpasser 演示导出清单\n电脑：" +
    m.code +
    "\n这是本地示例，不包含真实远程文件。";
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = m.code + "-demo-manifest.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("已下载演示清单；未读取真实电脑文件");
}
export function portalLabel(portal: Portal) {
  return {
    web: "工作空间",
    admin: "运营管理",
    supplier: "供应商工作台",
    desktop: "桌面客户端",
  }[portal];
}
export function registerSubscriptionResource(
  externalRef: string,
  providers: AI[],
  costMinor: number,
  capacity: number,
  validUntil: number,
) {
  const supplier = state.suppliers.find((item) => item.id === ui.supplierId);
  if (
    !supplier ||
    supplier.state !== "approved" ||
    supplier.kind === "computer"
  )
    throw new Error("当前供方未开通卡／订阅供货权限");
  if (
    !externalRef.trim() ||
    /^[0-9]{12,19}$/.test(externalRef.replace(/[\s-]/g, ""))
  )
    throw new Error("请填写供方脱敏资源引用，不填写完整卡号");
  if (!supplier.canActivateAi && providers.length)
    throw new Error("纯供卡资源不能申报 AI 开通能力");
  if (supplier.canActivateAi && !providers.length)
    throw new Error("请选择已审核的开通服务");
  if (
    !Number.isSafeInteger(costMinor) ||
    costMinor <= 0 ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    !Number.isFinite(validUntil) ||
    validUntil <= Date.now()
  )
    throw new Error("请检查支持服务、成本、可供量和有效期");
  if (
    state.subscriptionResources.some(
      (item) =>
        item.supplierId === supplier.id &&
        item.externalRef === externalRef.trim(),
    )
  )
    throw new Error("此供方资源引用已登记");
  state.subscriptionResources.push({
    id: id("subscription"),
    subtype: supplier.canActivateAi ? "activation_service" : "payment_card",
    supplierId: supplier.id,
    externalRef: externalRef.trim(),
    providers: [...new Set(providers)],
    costMinor,
    currency: "CNY",
    capacity,
    validUntil,
    state: "inspection",
  });
  notify("演示订阅资源已登记，等待平台验收；未发起开卡或充值");
}
export function verifySubscriptionResource(resourceId: string) {
  const resource = state.subscriptionResources.find(
    (item) => item.id === resourceId,
  );
  if (!resource || resource.validUntil <= Date.now())
    throw new Error("此资源不存在或有效期已结束");
  resource.state = "verified";
  notify("已保存演示资源验收状态；真实能力和认证仍需核验");
}
function onDemoStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    const incoming = JSON.parse(event.newValue) as DemoState;
    if (
      incoming.version !== 3 ||
      !["personal", "team"].includes(incoming.workspaceKind) ||
      !Array.isArray(incoming.members) ||
      !Array.isArray(incoming.machines) ||
      !Array.isArray(incoming.orders) ||
      !Array.isArray(incoming.suppliers) ||
      !Array.isArray(incoming.tasks) ||
      !Array.isArray(incoming.tickets) ||
      !Array.isArray(incoming.subscriptionResources) ||
      !Array.isArray(incoming.activities) ||
      !incoming.members.some(
        (member) => member.id === incoming.currentAccountId,
      )
    )
      return;
    if (JSON.stringify(state) !== event.newValue) {
      const identityChanged =
        state.currentAccountId !== incoming.currentAccountId ||
        state.workspaceKind !== incoming.workspaceKind;
      Object.assign(state, incoming);
      if (
        identityChanged ||
        !currentAccount.value.enabled ||
        currentAccount.value.firstLogin
      )
        closeDialog();
      const active = state.machines.find(
        (machine) => machine.id === ui.activeMachineId,
      );
      if (!active || !canConnect(active, currentAccount.value))
        ui.activeMachineId = "";
    }
  } catch {}
}
window.addEventListener("storage", onDemoStorage);
if (import.meta.hot)
  import.meta.hot.dispose(() =>
    window.removeEventListener("storage", onDemoStorage),
  );

export function upgradeToTeam() {
  mainOnly();
  if (isTeam.value) return;
  state.workspaceKind = "team";
  closeDialog();
  notify("已开通演示团队空间；现有订单、电脑和权益继续保留");
}
export function activatePersonalMachine(machineId: string) {
  mainOnly();
  if (isTeam.value) throw new Error("团队电脑请通过分配流程处理");
  const target = getMachine(machineId);
  if (
    target.state !== "online" ||
    phase(target) !== "desktop" ||
    target.customerOwned === false
  )
    throw new Error("目标电脑尚未交付或不可用");
  for (const previous of state.machines.filter(
    (m) => m.id !== target.id && occupiesAccount(m, state.currentAccountId),
  )) {
    previous.assignedTo = null;
    previous.exportOwnerId = null;
    previous.pendingAssignmentTo = null;
    previous.state = "resetting";
    for (const ai of previous.ai) ai.state = "terminated";
    previous.credentialVersion++;
    previous.leaseVersion++;
  }
  target.assignedTo = state.currentAccountId;
  target.exportOwnerId = state.currentAccountId;
  target.leaseVersion++;
  ui.activeMachineId = "";
  notify("演示电脑已切换；旧机待清理，未执行真实重置或退款");
}

export function knownAiEmail(machine: Machine, provider: AI): string {
  for (const item of machine.ai
    .filter((a) => a.provider === provider && a.state !== "terminated")
    .sort((a, b) => b.promisedUntil - a.promisedUntil)) {
    const order = state.orders.find((o) => o.id === item.orderId);
    const unit = order?.units.find((u) => u.id === item.unitId);
    const email =
      item.targetEmail ||
      unit?.aiEmails?.[provider] ||
      unit?.aiEmail ||
      order?.aiEmail;
    if (email) return email;
  }
  return "";
}

export function confirmPersonalActivation(machineId: string) {
  const snapshot = () =>
    JSON.stringify(
      state.machines
        .filter(
          (m) =>
            m.id === machineId || occupiesAccount(m, state.currentAccountId),
        )
        .map((m) => [m.id, m.leaseVersion, m.assignedTo, m.state]),
    );
  const expected = snapshot();
  askConfirm(
    "请先自行导出旧电脑文件。确认后旧机清空，旧电脑和 AI 剩余费用不退不抵；新机沿本次订单的交付时间计时。",
    () => {
      if (snapshot() !== expected)
        throw new Error("电脑状态已变化，请重新确认切换");
      activatePersonalMachine(machineId);
    },
  );
}
