import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAY, canConnect } from "../shared/models";
import { products } from "../shared/catalog";
import {
  state,
  ui,
  resetDemo,
  assign,
  unassign,
  completeDemoHandoff,
  createOrder,
  simulatePayment,
  acceptTask,
  reportTask,
  verifyTask,
  deliverUnit,
  askConfirm,
  switchAccount,
  registerSubscriptionResource,
  createMember,
  upgradeToTeam,
  activatePersonalMachine,
  myMachines,
} from "../shared/store";

beforeEach(() => {
  vi.useRealTimers();
  resetDemo("team");
});
afterEach(() => vi.useRealTimers());
function verifyUnit(orderId: string) {
  const order = state.orders.find((o) => o.id === orderId)!;
  for (const task of state.tasks.filter((t) => t.orderId === orderId)) {
    acceptTask(task.id);
    reportTask(task.id, "回归测试：本次指定资源与权益已验证。");
    verifyTask(task.id);
  }
  return order.units[0]!;
}

describe("全面复核回归", () => {
  it("重复AI选择和超出安全范围的订单金额不会创建订单", () => {
    const count = state.orders.length;
    expect(() =>
      createOrder(
        products[0]!,
        "",
        "new",
        ["claude", "claude"],
        1,
        "target@example.invalid",
      ),
    ).toThrow();
    expect(() =>
      createOrder(
        { ...products[0]!, priceMinor: Number.MAX_SAFE_INTEGER },
        "",
        "new",
        [],
        2,
        "",
      ),
    ).toThrow("金额");
    expect(state.orders).toHaveLength(count);
  });
  it("续订沿用原账号，不能默默换成新生成的邮箱", () => {
    const current = state.machines.find((m) => m.id === "m-01")!;
    const original = current.ai.find(
      (a) => a.provider === "claude",
    )!.targetEmail;
    const order = createOrder(
      null,
      current.id,
      "renewal",
      ["claude"],
      1,
      "different@example.invalid",
    );
    simulatePayment(order.orderId);
    expect(
      state.tasks.find(
        (t) => t.orderId === order.orderId && t.kind === "claude",
      )!.targetEmail,
    ).toBe(original);
  });
  it("到期旧电脑保留导出归属，但不阻止账号使用新电脑", () => {
    expect(() => assign("m-03", "a-chen", "preserve_files")).not.toThrow();
    completeDemoHandoff("m-03");
    expect(
      canConnect(
        state.machines.find((m) => m.id === "m-03")!,
        state.members.find((m) => m.id === "a-chen")!,
      ),
    ).toBe(true);
    expect(state.machines.find((m) => m.id === "m-04")!.assignedTo).toBe(
      "a-chen",
    );
  });
  it("加购待付期间电脑续费，旧报价失效且不能默改AI截止", () => {
    const addon = createOrder(
      null,
      "m-03",
      "ai_addon",
      ["claude"],
      1,
      "target@example.invalid",
    );
    const renewal = createOrder(null, "m-03", "renewal", [], 1, "");
    simulatePayment(renewal.orderId);
    expect(() => simulatePayment(addon.orderId)).toThrow("报价");
    expect(state.orders.find((o) => o.id === addon.orderId)!.state).toBe(
      "awaiting_payment",
    );
    expect(state.machines.find((m) => m.id === "m-03")!.ai).toHaveLength(0);
  });
  it("迟到的验收不能重新开放已交付单元或再次延长租期", () => {
    const created = createOrder(products[0]!, "", "new", [], 1, "");
    simulatePayment(created.orderId);
    const unit = verifyUnit(created.orderId);
    deliverUnit(created.orderId, unit.id);
    const machine = state.machines.find((m) => m.id === unit.machineId)!,
      original = machine.expiresAt;
    const task = state.tasks.find((t) => t.unitId === unit.id)!;
    state.tasks.push({ ...task, id: "late-result", state: "reported" });
    verifyTask("late-result");
    expect(unit.state).toBe("delivered");
    expect(() => deliverUnit(created.orderId, unit.id)).toThrow();
    expect(machine.expiresAt).toBe(original);
  });
  it("切换账号使原确认失效，包括已捕获的回调", () => {
    const execute = vi.fn();
    askConfirm("原账号的操作", execute);
    const saved = ui.confirmAction!;
    switchAccount("a-lin");
    expect(ui.confirmAction).toBeNull();
    expect(() => saved()).toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
  it("拒绝带空格或连字符的完整卡号", () => {
    ui.supplierId = "s-subscription";
    for (const value of ["4111 1111 1111 1111", "4111-1111-1111-1111"]) {
      expect(() =>
        registerSubscriptionResource(value, [], 10000, 1, Date.now() + DAY),
      ).toThrow("卡号");
    }
  });
  it("到期收回旧电脑后仍保留原使用者的导出归属", () => {
    unassign("m-04");
    expect(state.machines.find((m) => m.id === "m-04")!.exportOwnerId).toBe(
      "a-chen",
    );
  });
});

describe("个人与团队使用路径", () => {
  beforeEach(() => resetDemo("personal"));
  it("个人空间只有本人，不要求创建子账号", () => {
    expect(state.members).toHaveLength(1);
    expect(() =>
      createMember("成员", "new@example.invalid", "temporary-password"),
    ).toThrow("团队");
    expect(() => createOrder(products[0]!, "", "new", [], 2, "")).toThrow(
      "个人空间",
    );
  });
  it("个人首次交付自动给本人使用", () => {
    state.machines = [];
    state.orders = [];
    const created = createOrder(products[0]!, "", "new", [], 1, "");
    simulatePayment(created.orderId);
    const unit = verifyUnit(created.orderId);
    deliverUnit(created.orderId, unit.id);
    const machine = state.machines.find((m) => m.id === unit.machineId)!;
    expect(machine.assignedTo).toBe(state.currentAccountId);
    expect(canConnect(machine, state.members[0]!)).toBe(true);
  });
  it("已有电脑时新购不抢占，确认切换才结束旧机及旧AI", () => {
    const previous = state.machines[0]!,
      expiry = previous.expiresAt;
    const created = createOrder(products[1]!, "", "new", [], 1, "");
    simulatePayment(created.orderId);
    const unit = verifyUnit(created.orderId);
    deliverUnit(created.orderId, unit.id);
    const next = state.machines.find((m) => m.id === unit.machineId)!;
    expect(next.assignedTo).toBeNull();
    expect(previous.assignedTo).toBe(state.currentAccountId);
    activatePersonalMachine(next.id);
    expect(next.assignedTo).toBe(state.currentAccountId);
    expect(previous.state).toBe("resetting");
    expect(previous.expiresAt).toBe(expiry);
    expect(previous.ai.every((a) => a.state === "terminated")).toBe(true);
  });
  it("开通团队保留订单、电脑、期限与AI", () => {
    const original = JSON.stringify({
      orders: state.orders,
      machines: state.machines,
    });
    upgradeToTeam();
    expect(state.workspaceKind).toBe("team");
    expect(
      JSON.stringify({ orders: state.orders, machines: state.machines }),
    ).toBe(original);
    expect(() =>
      createMember("成员", "new@example.invalid", "temporary-password"),
    ).not.toThrow();
  });
  it("登记的供应库存不出现在个人已购电脑中", () => {
    state.machines.push({
      ...state.machines[0]!,
      id: "supplier-stock",
      customerOwned: false,
      assignedTo: null,
    });
    expect(myMachines.value.map((m) => m.id)).not.toContain("supplier-stock");
  });
});
