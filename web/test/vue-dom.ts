import { createApp, nextTick, type App, type Component } from "vue";
// Thin DOM driver for these tests. It mounts the real Vue app in happy-dom;
// no layout, browser focus, network or native-device behavior is simulated here.
export class VueWrapper {
  constructor(
    private element: Element | null,
    private app?: App,
  ) {}
  exists() {
    return this.element !== null;
  }
  text() {
    return this.element?.textContent || "";
  }
  find(selector: string) {
    return new VueWrapper(this.element?.querySelector(selector) || null);
  }
  findAll(selector: string) {
    return Array.from(this.element?.querySelectorAll(selector) || []).map(
      (node) => new VueWrapper(node),
    );
  }
  attributes(name: string) {
    return this.element?.getAttribute(name) ?? undefined;
  }
  async trigger(type: string) {
    if (!this.element)
      throw new Error("Cannot trigger " + type + " on a missing element");
    const event =
      type === "click"
        ? new MouseEvent(type, { bubbles: true, cancelable: true })
        : new Event(type, { bubbles: true, cancelable: true });
    this.element.dispatchEvent(event);
    await nextTick();
  }
  async setValue(value: string | number | boolean) {
    const element = this.element;
    if (
      element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
    )
      element.checked = Boolean(value);
    else if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    )
      element.value = String(value);
    else throw new Error("setValue requires an input, select or textarea");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
  }
  unmount() {
    this.app?.unmount();
    this.element?.remove();
  }
}
export function mount(
  component: Component,
  options: { attachTo: HTMLElement },
) {
  const container = document.createElement("div");
  options.attachTo.append(container);
  const app = createApp(component);
  app.mount(container);
  return new VueWrapper(container, app);
}
export async function flushPromises() {
  await nextTick();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
