import { computed, reactive, watch } from "vue";
import { products, resetCatalog } from "./catalog";
import {
  AI_PRICE,
  AI_NAME,
  DAY,
  canConnect,
  phase,
  type AI,
  type DemoState,
  type Machine,
  type Product,
  type Portal,
} from "./models";
export const STORAGE_KEY = "thinkpasser.interactive-demo.v1";
const id = (prefix: string) => prefix + "-" + crypto.randomUUID().slice(0, 8);
function initialState(): DemoState {
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
      state: "online",
      ai: ai.map((provider) => ({
        provider,
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
  return {
    version: 1,
    subscriptionResources: [
      {
        id: "sr-01",
        supplierId: "s-subscription",
        externalRef: "NORTHSTAR-SUB-DEMO-01",
        providers: ["claude", "codex"],
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
          { id: "u-05", machineId: "m-05", state: "preparing", ai: ["claude"] },
        ],
        aiEmail: "workspace@example.invalid",
      },
    ],
    suppliers: [
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
        name: "Northstar 订阅服务",
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
        supplierId: "s-subscription",
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
}
function load(): DemoState {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value) {
      const data = JSON.parse(value);
      if (
        data.version === 1 &&
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
  state.machines.filter((m) => m.assignedTo === currentAccount.value.id),
);
export const isMain = computed(() => currentAccount.value.role === "main");
export const visibleMachines = computed(() =>
  isMain.value ? state.machines : myMachines.value,
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
  ui.confirmAction = action;
  ui.dialog = "confirm";
}
export function switchAccount(accountId: string) {
  const member = state.members.find((m) => m.id === accountId);
  if (!member?.enabled) throw new Error("该演示账号已停用");
  state.currentAccountId = accountId;
  ui.activeMachineId = "";
  ui.sidebarOpen = false;
  ui.dialog = null;
  notify(
    "已切换到 " +
      member.name +
      " · " +
      (member.role === "main" ? "主账号" : "子账号"),
  );
  location.hash = "machines";
}
export function resetDemo() {
  resetCatalog();
  ui.supplierId = "s-compute";
  ui.sidebarOpen = false;
  Object.assign(state, initialState());
  ui.activeMachineId = "";
  closeDialog();
  notify("演示数据已恢复");
}
function mainOnly() {
  if (!isMain.value || !currentAccount.value.enabled)
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
      (other) =>
        other.id !== machineId &&
        other.assignedTo === accountId &&
        other.state !== "resetting",
    )
  )
    throw new Error("该账号已有一台电脑，请先收回原分配");
  const changing = m.assignedTo && m.assignedTo !== accountId;
  if (changing) {
    m.credentialVersion++;
    if (mode === "reset")
      log("已提交演示重置", m.code + " · 真实清理仍需设备验收", "amber");
  }
  m.assignedTo = accountId;
  m.leaseVersion++;
  ui.activeMachineId = "";
  log("电脑分配已更新", m.code + " → " + member.name);
  notify("演示分配已更新；实际设备凭据需要后端执行");
}
export function unassign(machineId: string) {
  mainOnly();
  const m = getMachine(machineId);
  m.assignedTo = null;
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
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
    throw new Error("请选择1到10台电脑");
  const unitCount = kind === "new" ? quantity : 1;
  const targetEmails = Array.isArray(email)
    ? email.map((item) => item.trim())
    : [email.trim()];
  if (
    ai.length &&
    (targetEmails.length !== unitCount ||
      targetEmails.some((item) => !item.includes("@")))
  )
    throw new Error("请为每台电脑分别提供本次AI开通的目标邮箱");
  if (
    ai.length &&
    new Set(targetEmails.map((item) => item.toLowerCase())).size !==
      targetEmails.length
  )
    throw new Error("多台电脑请分别确认目标账号，不能自动共用同一订阅");
  const existing = machineId ? getMachine(machineId) : null;
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
  const oid = id("TP"),
    units = Array.from(
      { length: kind === "new" ? quantity : 1 },
      (_, index) => ({
        id: id("unit"),
        aiEmail: ai.length ? targetEmails[index] : undefined,
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
    for (const provider of unit.ai)
      m.ai.push({
        provider,
        state: "preparing",
        promisedFrom: promiseFrom,
        promisedUntil: order.type === "new" ? 0 : m.expiresAt,
        paidMinor: AI_PRICE[provider],
      });
    const kinds: ("computer_prepare" | AI)[] =
      order.type === "new" ? ["computer_prepare", ...unit.ai] : [...unit.ai];
    for (const kind of kinds)
      state.tasks.unshift({
        id: id("T"),
        supplierId:
          kind === "computer_prepare" ? "s-compute" : "s-subscription",
        orderId: order.id,
        unitId: unit.id,
        machineId: m.id,
        kind,
        state: "offered",
        targetEmail:
          kind === "computer_prepare"
            ? ""
            : (unit.aiEmail ?? order.aiEmail ?? ""),
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
    state.tasks
      .filter((t) => t.unitId === unit.id)
      .every((t) => t.state === "verified")
  )
    unit.state = "ready";
  notify("演示验收已记录；真实服务仍需实际证据");
}
export function deliverUnit(orderId: string, unitId: string) {
  const order = state.orders.find((o) => o.id === orderId),
    unit = order?.units.find((u) => u.id === unitId);
  if (!order || !unit || unit.state !== "ready")
    throw new Error("电脑及所购 AI 尚未全部验收");
  const m = getMachine(unit.machineId),
    now = Date.now();
  if (order.type === "new") {
    m.state = "online";
    m.leaseStart = now;
    m.expiresAt = now + 30 * DAY;
  }
  for (const ai of m.ai.filter(
    (a) => a.state === "preparing" && unit.ai.includes(a.provider),
  )) {
    if (order.type === "new") {
      ai.promisedFrom = now;
      ai.promisedUntil = m.expiresAt;
    }
    if (ai.promisedUntil <= now)
      throw new Error("原承诺期已结束，请先处理异常");
    ai.state = "available";
  }
  if (order.type === "ai_addon") {
    m.expiresAt += Math.max(0, now - (order.paidAt ?? now));
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
  if (m.assignedTo !== currentAccount.value.id || phase(m) !== "export_only")
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
  if (!externalRef.trim() || /^[0-9]{12,19}$/.test(externalRef.trim()))
    throw new Error("请填写供方脱敏资源引用，不填写完整卡号");
  if (
    !providers.length ||
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
      incoming.version !== 1 ||
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
      Object.assign(state, incoming);
      const active = state.machines.find(
        (machine) => machine.id === ui.activeMachineId,
      );
      if (active && !canConnect(active, currentAccount.value))
        ui.activeMachineId = "";
    }
  } catch {}
}
window.addEventListener("storage", onDemoStorage);
if (import.meta.hot)
  import.meta.hot.dispose(() =>
    window.removeEventListener("storage", onDemoStorage),
  );
