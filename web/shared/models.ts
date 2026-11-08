export type Portal = "web" | "admin" | "supplier" | "desktop";
export type OS = "macos" | "windows";
export type AI = "claude" | "codex";
export type Phase = "desktop" | "export_only" | "none";
export type UnitState = "preparing" | "ready" | "delivered" | "cancelled";
export type TaskState =
  | "offered"
  | "accepted"
  | "reported"
  | "verified"
  | "failed";
export interface Member {
  id: string;
  name: string;
  email: string;
  role: "main" | "sub";
  enabled: boolean;
  firstLogin: boolean;
}
export interface Entitlement {
  provider: AI;
  state: "preparing" | "available" | "interrupted" | "expired" | "terminated";
  promisedFrom: number;
  promisedUntil: number;
  paidMinor: number;
}
export interface Machine {
  id: string;
  code: string;
  name: string;
  os: OS;
  country: string;
  region: string;
  cpu: string;
  memory: number;
  disk: number;
  leaseStart: number;
  expiresAt: number;
  assignedTo: string | null;
  state: "online" | "preparing" | "unknown" | "resetting";
  ai: Entitlement[];
  priceMinor: number;
  credentialVersion: number;
  leaseVersion: number;
  autoRenew: boolean;
  supplierId: string;
}
export interface Product {
  id: string;
  name: string;
  os: OS;
  country: string;
  region: string;
  cpu: string;
  memory: number;
  disk: number;
  priceMinor: number;
  available: boolean;
  badge?: string;
}
export interface OrderUnit {
  id: string;
  aiEmail?: string;
  machineId: string;
  state: UnitState;
  ai: AI[];
}
export interface Order {
  id: string;
  createdAt: number;
  paidAt?: number;
  paymentProvider?: "alipay" | "wechat" | "card" | "paypal";
  productSnapshot?: Product;
  type: "new" | "renewal" | "ai_addon";
  state: "awaiting_payment" | "preparing" | "delivered" | "cancelled";
  amountMinor: number;
  productName: string;
  units: OrderUnit[];
  aiEmail?: string;
}
export interface Supplier {
  id: string;
  name: string;
  kind: "computer" | "subscription" | "both";
  selfOperated: boolean;
  state: "applied" | "approved" | "suspended";
  contact: string;
  leadHours: number;
}
export interface SupplyTask {
  id: string;
  supplierId: string;
  orderId: string;
  unitId: string;
  machineId: string;
  kind: "computer_prepare" | "claude" | "codex";
  state: TaskState;
  targetEmail: string;
  createdAt: number;
  deadline: number;
  evidence: string;
  costMinor: number;
}
export interface Ticket {
  id: string;
  machineId: string;
  reporterId: string;
  kind: "computer_fault" | "ai_fault";
  provider?: AI;
  description: string;
  createdAt: number;
  state: "open" | "repairing" | "resolved";
  decision?: string;
}
export interface Activity {
  id: string;
  label: string;
  detail: string;
  at: number;
  tone: "green" | "blue" | "amber";
}
export interface DemoState {
  version: 1;
  currentAccountId: string;
  members: Member[];
  machines: Machine[];
  orders: Order[];
  suppliers: Supplier[];
  subscriptionResources: SubscriptionResource[];
  tasks: SupplyTask[];
  tickets: Ticket[];
  activities: Activity[];
}
export interface SubscriptionResource {
  id: string;
  supplierId: string;
  externalRef: string;
  providers: AI[];
  costMinor: number;
  currency: "CNY";
  capacity: number;
  validUntil: number;
  state: "inspection" | "verified" | "suspended";
}
export const DAY = 86_400_000;
export const AI_PRICE: Record<AI, number> = { claude: 39900, codex: 29900 };
export const AI_NAME: Record<AI, string> = {
  claude: "Claude Code",
  codex: "Codex",
};
export const COUNTRY: Record<string, { label: string; flag: string }> = {
  US: { label: "美国", flag: "🇺🇸" },
  JP: { label: "日本", flag: "🇯🇵" },
  SG: { label: "新加坡", flag: "🇸🇬" },
  DE: { label: "德国", flag: "🇩🇪" },
};
export function phase(machine: Machine, now = Date.now()): Phase {
  if (machine.state === "preparing" || machine.state === "resetting")
    return "none";
  if (now < machine.expiresAt) return "desktop";
  return now < machine.expiresAt + 3 * DAY ? "export_only" : "none";
}
export function canConnect(machine: Machine, member: Member, now = Date.now()) {
  return (
    member.enabled &&
    !member.firstLogin &&
    machine.assignedTo === member.id &&
    machine.state === "online" &&
    phase(machine, now) === "desktop"
  );
}
export function money(minor: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
export function date(at: number, time = false) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(at);
}
export function remaining(at: number, now = Date.now()) {
  const delta = at - now;
  return delta <= 0
    ? "已到期"
    : delta < DAY
      ? "不足 1 天"
      : Math.ceil(delta / DAY) + " 天";
}
export function proratedRefund(
  paidMinor: number,
  from: number,
  until: number,
  intervals: [number, number][],
  settled = 0,
): number {
  if (
    !Number.isSafeInteger(paidMinor) ||
    paidMinor < 0 ||
    until <= from ||
    !Number.isSafeInteger(settled) ||
    settled < 0
  )
    throw new Error("无效退款参数");
  const ranges = intervals
    .map(
      ([a, b]) => [Math.max(a, from), Math.min(b, until)] as [number, number],
    )
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    start = 0,
    end = 0;
  for (const [a, b] of ranges) {
    if (!end) {
      start = a;
      end = b;
    } else if (a <= end) end = Math.max(end, b);
    else {
      total += end - start;
      start = a;
      end = b;
    }
  }
  if (end) total += end - start;
  return Math.max(
    0,
    Number((BigInt(paidMinor) * BigInt(total)) / BigInt(until - from)) -
      settled,
  );
}
