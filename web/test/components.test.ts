import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { mount, flushPromises, type VueWrapper } from "./vue-dom";
describe("订阅资源表单", () => {
  it("订阅侧能登记脱敏资源，平台端独立验收", async () => {
    app("supplier", "resources");
    await settle();
    await wrapper!
      .find('select[aria-label="切换演示供应商"]')
      .setValue("s-subscription");
    await settle();
    await button("登记订阅资源").trigger("click");
    const form = wrapper!.find("form.modal-form");
    await form
      .find('input[type="text"], input:not([type])')
      .setValue("DEMO-RESOURCE-NEW");
    const numbers = form.findAll('input[type="number"]');
    await numbers[0]!.setValue("280");
    await numbers[1]!.setValue("3");
    await form
      .find('input[type="datetime-local"]')
      .setValue("2030-11-08T12:00");
    await form.trigger("submit");
    await settle();
    expect(state.subscriptionResources.at(-1)!.state).toBe("inspection");
    expect(wrapper!.text()).toContain("DEMO-RESOURCE-NEW");
    wrapper!.unmount();
    app("admin", "resources");
    await settle();
    await button("演示验收").trigger("click");
    expect(state.subscriptionResources.at(-1)!.state).toBe("verified");
  });
});
describe("补充表单交互", () => {
  it("演示登录支持邮箱密码和错误提示", async () => {
    app("web", "login");
    await settle();
    expect(wrapper!.text()).toContain("登录你的工作空间");
    await wrapper!.find('input[type="password"]').setValue("wrong-password");
    await wrapper!.find(".auth-form-panel form").trigger("submit");
    expect(wrapper!.find(".form-error").text()).toContain("demo-pass-123");
    await wrapper!.find('input[type="password"]').setValue("demo-pass-123");
    await wrapper!.find(".auth-form-panel form").trigger("submit");
    await settle();
    expect(location.hash).toBe("#machines");
  });
  it("商品编辑保存为新报价，旧订单金额保持不变", async () => {
    app("admin", "products");
    await settle();
    const oldAmount = state.orders[0]!.amountMinor;
    await wrapper!.find(".product-price .button").trigger("click");
    await settle();
    expect(wrapper!.find("dialog").text()).toContain("编辑商品配置");
    const numbers = wrapper!.findAll('.modal-form input[type="number"]');
    await numbers[2]!.setValue("599");
    await wrapper!.find(".modal-form").trigger("submit");
    await settle();
    expect(wrapper!.find("dialog").exists()).toBe(false);
    expect(wrapper!.text()).toContain("599");
    expect(state.orders[0]!.amountMinor).toBe(oldAmount);
  });
});
import App from "../app/App.vue";
import {
  state,
  ui,
  resetDemo,
  switchAccount,
  openDesktop,
} from "../shared/store";
let wrapper: VueWrapper | undefined;
async function settle() {
  await flushPromises();
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  await flushPromises();
}
function button(text: string) {
  const found = wrapper!.findAll("button").find((b) => b.text().includes(text));
  if (!found) throw new Error("Missing button: " + text);
  return found;
}
function app(portal = "web", route = "overview") {
  document.body.dataset.portal = portal;
  location.hash = route;
  wrapper = mount(App, { attachTo: document.body });
  return wrapper;
}
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetDemo();
  document.body.dataset.portal = "web";
  location.hash = "overview";
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  );
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
  ui.toast = "";
  ui.dialog = null;
});
describe("四端组件交互", () => {
  it.each([
    ["web", "overview", "欢迎回来"],
    ["admin", "overview", "运营总览"],
    ["supplier", "overview", "每一次交付"],
    ["desktop", "machines", "我的电脑"],
  ])("%s入口能挂载并标记演示", async (portal, route, text) => {
    app(portal, route);
    await settle();
    expect(wrapper!.text()).toContain(text);
    expect(wrapper!.find(".demo-notice").text()).toContain("不产生真实收款");
  });
  it("商品系统、搜索与地区筛选真实更新列表", async () => {
    app("web", "marketplace");
    await settle();
    expect(wrapper!.findAll(".product-card")).toHaveLength(6);
    await button("Windows").trigger("click");
    expect(wrapper!.findAll(".product-card")).toHaveLength(2);
    await button("全部电脑").trigger("click");
    await wrapper!.find('input[aria-label="搜索电脑"]').setValue("东京");
    expect(wrapper!.findAll(".product-card")).toHaveLength(1);
    await wrapper!.find('select[aria-label="地区筛选"]').setValue("US");
    expect(wrapper!.findAll(".product-card")).toHaveLength(0);
    expect(wrapper!.text()).toContain("没有找到匹配的电脑");
  });
  it("选择配置打开结算，创建的是待付款演示订单", async () => {
    app("web", "marketplace");
    await settle();
    await wrapper!.find(".product-price .button").trigger("click");
    await settle();
    expect(wrapper!.find("dialog").exists()).toBe(true);
    expect(wrapper!.find("dialog").text()).toContain("准备你的新电脑");
    await wrapper!.find(".consent input").setValue(true);
    await wrapper!.find(".checkout-layout").trigger("submit");
    await settle();
    expect(state.orders[0]!.state).toBe("awaiting_payment");
    expect(wrapper!.text()).toContain("待付款");
    expect(ui.dialog).toBeNull();
  });
  it("主账号看团队资源仍不能连接子账号电脑", async () => {
    app("web", "machines");
    await settle();
    expect(wrapper!.findAll(".machine-card")).toHaveLength(1);
    await button("团队资源").trigger("click");
    expect(wrapper!.findAll(".machine-card")).toHaveLength(5);
    const card = wrapper!
      .findAll(".machine-card")
      .find((c) => c.text().includes("TP-JP-002"))!;
    expect(card.text()).toContain("仅可管理");
    expect(
      card.find(".machine-actions button").attributes("disabled"),
    ).toBeDefined();
  });
  it("切换子账号后导航和电脑列表同步缩小权限", async () => {
    app("web", "overview");
    await settle();
    await wrapper!.find(".account-trigger").trigger("click");
    const saved = wrapper!
      .findAll(".dropdown-panel>button")
      .find((b) => b.text().includes("林小满"))!;
    await saved.trigger("click");
    await settle();
    expect(wrapper!.find(".main-nav").text()).not.toContain("团队与子账号");
    expect(wrapper!.findAll(".machine-card")).toHaveLength(1);
    expect(wrapper!.text()).toContain("TP-JP-002");
    expect(wrapper!.text()).not.toContain("TP-US-001");
    location.hash = "team";
    await settle();
    expect(wrapper!.text()).toContain("此页面需要主账号");
  });
  it("到期子账号保留导出入口但完整远控不可用", async () => {
    switchAccount("a-chen");
    app("web", "machines");
    await settle();
    expect(wrapper!.text()).toContain("仅可导出");
    expect(wrapper!.text()).toContain("导出演示清单");
    expect(wrapper!.findAll(".machine-card")).toHaveLength(1);
  });
  it("创建子账号完成表单交互，初始密码不入演示状态", async () => {
    app("web", "team");
    await settle();
    await button("创建子账号").trigger("click");
    const inputs = wrapper!.findAll(".modal-form input");
    await inputs[0]!.setValue("新同事");
    await inputs[1]!.setValue("new-team@example.invalid");
    await inputs[2]!.setValue("temporary-password");
    await wrapper!.find(".modal-form").trigger("submit");
    await settle();
    expect(state.members.at(-1)!.name).toBe("新同事");
    expect(state.members.at(-1)!.firstLogin).toBe(true);
    expect(JSON.stringify(state)).not.toContain("temporary-password");
  });
  it("供应商切换后只显示当前供方任务", async () => {
    app("supplier", "tasks");
    await settle();
    expect(wrapper!.findAll(".task-table tbody tr")).toHaveLength(1);
    expect(wrapper!.find(".task-table").text()).toContain("电脑准备");
    await wrapper!
      .find('select[aria-label="切换演示供应商"]')
      .setValue("s-subscription");
    await settle();
    expect(wrapper!.findAll(".task-table tbody tr")).toHaveLength(1);
    expect(wrapper!.find(".task-table").text()).toContain("Claude Code 开通");
    expect(wrapper!.find(".task-table").text()).not.toContain("电脑准备");
  });
  it("管理员验收只改任务状态，不跳过整套交付条件", async () => {
    app("admin", "tasks");
    await settle();
    await button("演示验收").trigger("click");
    expect(state.tasks.find((t) => t.id === "T-1001")!.state).toBe("verified");
    expect(
      state.orders.find((o) => o.id === "TP-20261108-002")!.units[0]!.state,
    ).toBe("preparing");
  });
  it("桌面预览仅响应本地白名单，不执行真实命令", async () => {
    openDesktop("m-01");
    app("desktop", "desktop");
    await settle();
    expect(wrapper!.text()).toContain("未连接真实电脑");
    const command = wrapper!.find("#preview-command");
    await command.setValue("help");
    await wrapper!.find(".terminal-input").trigger("submit");
    expect(wrapper!.find(".terminal-lines").text()).toContain(
      "可用的本地演示命令",
    );
    await command.setValue("anything");
    await wrapper!.find(".terminal-input").trigger("submit");
    expect(wrapper!.find(".terminal-lines").text()).toContain("不执行系统命令");
  });
  it("弹窗取消事件关闭弹窗，未产生业务操作", async () => {
    app("web", "team");
    await settle();
    await button("创建子账号").trigger("click");
    await wrapper!.find("dialog").trigger("cancel");
    await settle();
    expect(wrapper!.find("dialog").exists()).toBe(false);
    expect(state.members).toHaveLength(3);
  });
});
