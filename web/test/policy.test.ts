import { describe, it, expect, beforeEach, vi } from "vitest";
import { DAY, phase, canConnect, proratedRefund } from "../shared/models";
import {
  state,
  ui,
  registerSubscriptionResource,
  verifySubscriptionResource,
  resetDemo,
  assign,
  completeDemoHandoff,
  unassign,
  switchAccount,
  createOrder,
  simulatePayment,
  acceptTask,
  reportTask,
  verifyTask,
  deliverUnit,
  createTicket,
  createMember,
  openDesktop,
} from "../shared/store";
import { products } from "../shared/catalog";
describe("两类供方与订阅资源", () => {
  it("纯卡供应商不接受 AI 开通用途，开通方必须声明服务", () => {
    ui.supplierId = "s-subscription";
    expect(() =>
      registerSubscriptionResource(
        "CARD-ONLY",
        ["claude"],
        10000,
        1,
        Date.now() + DAY,
      ),
    ).toThrow("纯供卡");
    ui.supplierId = "s-activation";
    expect(() =>
      registerSubscriptionResource(
        "NO-SERVICE",
        [],
        10000,
        1,
        Date.now() + DAY,
      ),
    ).toThrow("请选择");
  });
  it("电脑供方不能登记卡订阅资源", () => {
    ui.supplierId = "s-compute";
    expect(() =>
      registerSubscriptionResource(
        "REF-ONE",
        ["claude"],
        28000,
        1,
        Date.now() + DAY,
      ),
    ).toThrow();
  });
  it("订阅资源先待验收，拒绝完整卡号及重复引用", () => {
    ui.supplierId = "s-subscription";
    expect(() =>
      registerSubscriptionResource(
        "4111111111111111",
        ["claude"],
        28000,
        1,
        Date.now() + DAY,
      ),
    ).toThrow();
    registerSubscriptionResource("REF-NEW", [], 28000, 2, Date.now() + DAY);
    const resource = state.subscriptionResources.at(-1)!;
    expect(resource.state).toBe("inspection");
    expect(() =>
      registerSubscriptionResource(
        "REF-NEW",
        ["claude"],
        28000,
        1,
        Date.now() + DAY,
      ),
    ).toThrow();
    verifySubscriptionResource(resource.id);
    expect(resource.state).toBe("verified");
  });
});
describe("跨入口状态与付款选择", () => {
  it("其他入口更新演示状态时同步账号并撤销无权桌面预览", () => {
    openDesktop("m-01");
    const incoming = JSON.parse(JSON.stringify(state));
    incoming.currentAccountId = "a-lin";
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "thinkpasser.interactive-demo.v3",
        newValue: JSON.stringify(incoming),
      }),
    );
    expect(state.currentAccountId).toBe("a-lin");
    expect(ui.activeMachineId).toBe("");
  });
  it("演示付款记录保留选中的渠道", () => {
    const { orderId } = createOrder(products[0]!, "", "new", [], 1, "");
    simulatePayment(orderId, "paypal");
    expect(state.orders.find((o) => o.id === orderId)!.paymentProvider).toBe(
      "paypal",
    );
  });
});
describe("报价与等待时间的一致性", () => {
  it("已创建订单保留硬件与价格快照，商品编辑不改原交付", () => {
    const { orderId } = createOrder(products[0]!, "", "new", [], 1, "");
    const oldMemory = products[0]!.memory,
      oldPrice = products[0]!.priceMinor;
    products[0]!.memory = 96;
    products[0]!.priceMinor = 99900;
    simulatePayment(orderId);
    const order = state.orders.find((o) => o.id === orderId)!;
    const machine = state.machines.find(
      (m) => m.id === order.units[0]!.machineId,
    )!;
    expect(order.amountMinor).toBe(oldPrice);
    expect(machine.memory).toBe(oldMemory);
    expect(machine.priceMinor).toBe(oldPrice);
  });
  it("AI等待补时只从演示付款确认开始，不把待支付时间计入", () => {
    vi.useFakeTimers();
    const start = Date.now();
    vi.setSystemTime(start);
    const machine = state.machines.find((m) => m.id === "m-03")!,
      original = machine.expiresAt;
    const { orderId } = createOrder(
      null,
      machine.id,
      "ai_addon",
      ["claude"],
      1,
      "target@example.invalid",
    );
    vi.setSystemTime(start + DAY);
    simulatePayment(orderId);
    vi.setSystemTime(start + DAY + 2 * 3600000);
    const order = state.orders.find((o) => o.id === orderId)!,
      unit = order.units[0]!;
    for (const task of state.tasks.filter((t) => t.unitId === unit.id)) {
      acceptTask(task.id);
      reportTask(task.id, "演示检查记录：指定AI已准备，等待平台验收。");
      verifyTask(task.id);
    }
    deliverUnit(order.id, unit.id);
    expect(machine.expiresAt).toBe(original + 2 * 3600000);
    expect(machine.ai[0]!.promisedUntil).toBe(original);
  });
  it("两个待付加购单不能在付款阶段重复发同种AI", () => {
    const first = createOrder(
      null,
      "m-03",
      "ai_addon",
      ["claude"],
      1,
      "target@example.invalid",
    );
    const second = createOrder(
      null,
      "m-03",
      "ai_addon",
      ["claude"],
      1,
      "target@example.invalid",
    );
    simulatePayment(first.orderId);
    const before = state.tasks.length;
    expect(() => simulatePayment(second.orderId)).toThrow();
    expect(state.tasks).toHaveLength(before);
    expect(state.orders.find((o) => o.id === second.orderId)!.state).toBe(
      "awaiting_payment",
    );
  });
  it("电脑到期后拒绝旧AI加购订单，不变成开通中", () => {
    vi.useFakeTimers();
    const machine = state.machines.find((m) => m.id === "m-03")!;
    const { orderId } = createOrder(
      null,
      machine.id,
      "ai_addon",
      ["claude"],
      1,
      "target@example.invalid",
    );
    vi.setSystemTime(machine.expiresAt);
    expect(() => simulatePayment(orderId)).toThrow();
    expect(machine.ai).toHaveLength(0);
  });
});
beforeEach(() => {
  vi.useRealTimers();
  resetDemo("team");
  location.hash = "";
});
describe("平台时间与费用边界", () => {
  it("恰好到期进入仅导出，三天末尾不能继续导出", () => {
    const m = { ...state.machines[0]!, expiresAt: 1000 };
    expect(phase(m, 999)).toBe("desktop");
    expect(phase(m, 1000)).toBe("export_only");
    expect(phase(m, 1000 + 3 * DAY - 1)).toBe("export_only");
    expect(phase(m, 1000 + 3 * DAY)).toBe("none");
  });
  it("没有AI也可以进入有效电脑，AI失效不锁电脑", () => {
    const m = state.machines[0]!,
      member = state.members[0]!;
    m.ai = [];
    expect(canConnect(m, member)).toBe(true);
    m.ai = [
      {
        id: "expired-ai",
        orderId: "expired-order",
        unitId: "expired-unit",
        provider: "claude",
        state: "expired",
        promisedFrom: 1,
        promisedUntil: 2,
        paidMinor: 30000,
      },
    ];
    expect(canConnect(m, member)).toBe(true);
  });
  it("主账号管理权不授予子账号电脑桌面访问", () => {
    expect(canConnect(state.machines[1]!, state.members[0]!)).toBe(false);
    expect(() => openDesktop("m-02")).toThrow();
  });
  it("300元承诺20天，一天故障退15元；重叠区间不重复", () => {
    const start = Date.now();
    expect(
      proratedRefund(30000, start, start + 20 * DAY, [
        [start, start + DAY],
        [start + DAY / 2, start + DAY],
      ]),
    ).toBe(1500);
    expect(
      proratedRefund(
        30000,
        start,
        start + 20 * DAY,
        [[start, start + DAY]],
        1500,
      ),
    ).toBe(0);
  });
  it("区间裁剪至原承诺期且不超过原实付", () => {
    const t = Date.now();
    expect(
      proratedRefund(30000, t, t + 20 * DAY, [[t - DAY, t + 30 * DAY]]),
    ).toBe(30000);
  });
});
describe("分配与账户", () => {
  it.each(["reset", "preserve_files"] as const)(
    "%s 交接验收前不开放，并预留目标账号",
    (mode) => {
      createMember("新成员", "handoff@example.invalid", "temporary-password");
      const target = state.members.at(-1)!;
      assign("m-03", target.id, mode);
      const machine = state.machines.find((m) => m.id === "m-03")!;
      expect(machine.state).toBe("resetting");
      expect(machine.assignedTo).toBeNull();
      expect(machine.pendingAssignmentTo).toBe(target.id);
      expect(canConnect(machine, target)).toBe(false);
      expect(() => assign("m-01", target.id, "preserve_files")).toThrow(
        "已有一台",
      );
      expect(() => unassign(machine.id)).toThrow();
      completeDemoHandoff(machine.id);
      expect(machine.assignedTo).toBe(target.id);
      expect(machine.pendingAssignmentTo).toBeNull();
      expect(machine.state).toBe("online");
    },
  );
  it("账号已有电脑时不能再分配，失败不改变原分配", () => {
    expect(() => assign("m-03", "a-main", "preserve_files")).toThrow();
    expect(state.machines.find((m) => m.id === "m-03")!.assignedTo).toBeNull();
  });
  it("子账号不能购买、创建子账号或调整分配", () => {
    switchAccount("a-lin");
    expect(() => assign("m-03", "a-main", "reset")).toThrow();
    expect(() =>
      createMember("测试", "test@example.invalid", "123456789012"),
    ).toThrow();
    expect(() => createOrder(products[0]!, "", "new", [], 1, "")).toThrow();
  });
  it("初始密码不持久化且新子账号首次需改密", () => {
    createMember("测试成员", "new@example.invalid", "a-demo-password");
    const account = state.members.at(-1)!;
    expect(account.firstLogin).toBe(true);
    expect(JSON.stringify(state)).not.toContain("a-demo-password");
  });
});
describe("完整本地交付流程", () => {
  it("两笔同种 AI 续费按精确权益验收，不能串单激活", () => {
    const first = createOrder(
      null,
      "m-03",
      "renewal",
      ["claude"],
      1,
      "same@example.invalid",
    );
    simulatePayment(first.orderId);
    const second = createOrder(
      null,
      "m-03",
      "renewal",
      ["claude"],
      1,
      "same@example.invalid",
    );
    simulatePayment(second.orderId);
    const order = state.orders.find((o) => o.id === first.orderId)!,
      unit = order.units[0]!;
    for (const task of state.tasks.filter((t) => t.unitId === unit.id)) {
      acceptTask(task.id);
      reportTask(task.id, "演示验收：指定账号和本次权益匹配。");
      verifyTask(task.id);
    }
    deliverUnit(order.id, unit.id);
    const machine = state.machines.find((m) => m.id === "m-03")!;
    expect(machine.ai.find((a) => a.orderId === first.orderId)!.state).toBe(
      "available",
    );
    expect(machine.ai.find((a) => a.orderId === second.orderId)!.state).toBe(
      "preparing",
    );
  });
  it("同时等待两种 AI 的重叠时间只补电脑一次", () => {
    vi.useFakeTimers();
    const start = Date.now(),
      machine = state.machines.find((m) => m.id === "m-03")!,
      original = machine.expiresAt;
    const first = createOrder(
      null,
      machine.id,
      "ai_addon",
      ["claude"],
      1,
      "same@example.invalid",
    );
    simulatePayment(first.orderId);
    const second = createOrder(
      null,
      machine.id,
      "ai_addon",
      ["codex"],
      1,
      "same@example.invalid",
    );
    simulatePayment(second.orderId);
    vi.setSystemTime(start + 3600000);
    for (const created of [first, second]) {
      const order = state.orders.find((o) => o.id === created.orderId)!,
        unit = order.units[0]!;
      for (const task of state.tasks.filter((t) => t.unitId === unit.id)) {
        acceptTask(task.id);
        reportTask(task.id, "演示验收：指定账号和本次权益匹配。");
        verifyTask(task.id);
      }
      deliverUnit(order.id, unit.id);
    }
    expect(machine.expiresAt).toBe(original + 3600000);
    expect(machine.ai.every((a) => a.promisedUntil === original)).toBe(true);
  });
  it("付款和供方回报不直接交付，全部平台验收后单独起租", () => {
    const created = createOrder(
      products[0]!,
      "",
      "new",
      ["claude", "codex"],
      2,
      ["first@example.invalid", "second@example.invalid"],
    );
    const order = state.orders.find((o) => o.id === created.orderId)!;
    expect(order.state).toBe("awaiting_payment");
    simulatePayment(order.id);
    const [first, second] = order.units;
    expect(
      state.machines.find((m) => m.id === first!.machineId)!.leaseStart,
    ).toBe(0);
    expect(() => deliverUnit(order.id, first!.id)).toThrow();
    const tasks = state.tasks.filter((t) => t.unitId === first!.id);
    for (const task of tasks) {
      acceptTask(task.id);
      reportTask(task.id, "演示检查：指定目标、电脑和AI准备结果。");
      expect(order.units[0]!.state).toBe("preparing");
      verifyTask(task.id);
    }
    deliverUnit(order.id, first!.id);
    expect(first!.state).toBe("delivered");
    expect(second!.state).toBe("preparing");
    expect(order.state).toBe("preparing");
    const m = state.machines.find((m) => m.id === first!.machineId)!;
    expect(m.expiresAt - m.leaseStart).toBe(30 * DAY);
  });
  it("重复演示支付不重复创建资源", () => {
    const { orderId } = createOrder(products[0]!, "", "new", [], 1, "");
    simulatePayment(orderId);
    const count = state.machines.length;
    expect(() => simulatePayment(orderId)).toThrow();
    expect(state.machines).toHaveLength(count);
  });
  it("AI加购全价且原电脑仍可用，既有同种AI不能重复购买", () => {
    const m = state.machines.find((m) => m.id === "m-03")!;
    const { orderId } = createOrder(
      null,
      m.id,
      "ai_addon",
      ["claude"],
      1,
      "target@example.invalid",
    );
    const o = state.orders.find((o) => o.id === orderId)!;
    expect(o.amountMinor).toBe(39900);
    simulatePayment(orderId);
    expect(m.ai[0]!.promisedUntil).toBe(m.expiresAt);
    expect(m.state).toBe("online");
    expect(() =>
      createOrder(
        null,
        m.id,
        "ai_addon",
        ["claude"],
        1,
        "target@example.invalid",
      ),
    ).toThrow();
  });
  it("未买AI的电脑不能提交该AI故障工单", () => {
    expect(() =>
      createTicket("m-03", "ai_fault", "claude", "这台电脑没有购买相应权益"),
    ).toThrow();
    expect(state.tickets).toHaveLength(1);
  });
});
