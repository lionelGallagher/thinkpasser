<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import Icon from "../shared/Icon.vue";
import Status from "../shared/Status.vue";
import EmptyState from "../shared/EmptyState.vue";
import {
  state,
  currentAccount,
  isMain,
  ui,
  switchAccount,
  safely,
  resetDemo,
  askConfirm,
  portalLabel,
  notify,
} from "../shared/store";
import type { Portal } from "../shared/models";
import Overview from "./views/Overview.vue";
import Marketplace from "./views/Marketplace.vue";
import Machines from "./views/Machines.vue";
import Team from "./views/Team.vue";
import Orders from "./views/Orders.vue";
import Tickets from "./views/Tickets.vue";
import Settings from "./views/Settings.vue";
import Auth from "./views/Auth.vue";
import AdminDesk from "../../admin/app/AdminDesk.vue";
import SupplierDesk from "../../supplier/app/SupplierDesk.vue";
import Desktop from "../../client/preview/Desktop.vue";
import Dialogs from "./Dialogs.vue";
const portal = (document.body.dataset.portal || "web") as Portal;
const route = ref(
  location.hash.slice(1) || (portal === "desktop" ? "machines" : "overview"),
);
const menuOpen = ref(false);
const nav = computed(() => {
  if (portal === "admin")
    return [
      { id: "overview", name: "运营总览", icon: "overview" },
      { id: "resources", name: "机器与资源", icon: "server" },
      { id: "accounts", name: "客户与账号", icon: "users" },
      { id: "orders", name: "订单与交付", icon: "orders" },
      { id: "suppliers", name: "供应商管理", icon: "users" },
      { id: "tasks", name: "供货任务", icon: "package" },
      { id: "products", name: "商品管理", icon: "boxes" },
      { id: "tickets", name: "售后工单", icon: "help" },
      { id: "finance", name: "资金与结算", icon: "wallet" },
    ];
  if (portal === "supplier")
    return [
      { id: "overview", name: "工作台", icon: "overview" },
      { id: "resources", name: "我的资源", icon: "server" },
      { id: "tasks", name: "供货任务", icon: "package" },
      { id: "settlement", name: "结算记录", icon: "wallet" },
      { id: "settings", name: "供应商资料", icon: "settings" },
    ];
  if (portal === "desktop")
    return [
      { id: "machines", name: "我的电脑", icon: "monitor" },
      { id: "desktop", name: "远控工作区", icon: "terminal" },
      { id: "accounts", name: "账号管理", icon: "users" },
      { id: "settings", name: "客户端设置", icon: "settings" },
    ];
  return [
    { id: "overview", name: "工作空间", icon: "overview" },
    { id: "marketplace", name: "选购电脑", icon: "boxes" },
    { id: "machines", name: "我的电脑", icon: "monitor" },
    ...(isMain.value
      ? [
          { id: "team", name: "团队与子账号", icon: "users" },
          { id: "orders", name: "我的订单", icon: "orders" },
        ]
      : []),
    { id: "tickets", name: "服务工单", icon: "help" },
  ];
});
const currentPage = computed(
  () => nav.value.find((n) => n.id === route.value)?.name || "工作空间",
);
const title = computed(() =>
  portal === "admin"
    ? "Thinkpasser Console"
    : portal === "supplier"
      ? "Thinkpasser Partners"
      : "Thinkpasser",
);
function navigate(id: string) {
  location.hash = id;
  ui.sidebarOpen = false;
}
function syncRoute() {
  route.value = location.hash.slice(1) || "overview";
  menuOpen.value = false;
}
onMounted(() => window.addEventListener("hashchange", syncRoute));
onBeforeUnmount(() => window.removeEventListener("hashchange", syncRoute));
const forbidden = computed(
  () =>
    portal === "web" &&
    !isMain.value &&
    ["team", "orders", "marketplace"].includes(route.value),
);
</script>
<template>
  <div
    class="app-shell"
    :class="['portal-' + portal, { 'sidebar-is-open': ui.sidebarOpen }]"
  >
    <button
      v-if="ui.sidebarOpen"
      class="sidebar-backdrop"
      aria-label="关闭导航"
      @click="ui.sidebarOpen = false"
    ></button>
    <aside class="sidebar">
      <a
        class="brand"
        :href="
          portal === 'web'
            ? '/web/'
            : portal === 'admin'
              ? '/admin/'
              : portal === 'supplier'
                ? '/supplier/'
                : '/client/preview/'
        "
        ><span class="brand-symbol"
          ><span></span><span></span><span></span></span
        ><span
          >{{ title
          }}<small>{{
            portal === "admin"
              ? "平台运营中心"
              : portal === "supplier"
                ? "供货合作伙伴"
                : "YOUR NEXT WORKSPACE"
          }}</small></span
        ></a
      >
      <div class="workspace-select">
        <span class="workspace-avatar">{{
          portal === "admin" ? "T" : portal === "supplier" ? "P" : "S"
        }}</span>
        <div>
          <strong>{{
            portal === "admin"
              ? "平台内部工作区"
              : portal === "supplier"
                ? "合作伙伴工作区"
                : "Studio 工作空间"
          }}</strong
          ><span>{{ portalLabel(portal) }}</span>
        </div>
        <Icon name="chevronDown" :size="14" />
      </div>
      <p class="nav-label">
        {{
          portal === "web"
            ? "WORKSPACE"
            : portal === "desktop"
              ? "DESKTOP"
              : "CONSOLE"
        }}
      </p>
      <nav class="main-nav" aria-label="主要导航">
        <a
          v-for="item in nav"
          :key="item.id"
          :href="'#' + item.id"
          :class="{ active: route === item.id }"
          :aria-current="route === item.id ? 'page' : undefined"
          @click="ui.sidebarOpen = false"
          ><Icon :name="item.icon" /><span>{{ item.name }}</span
          ><span v-if="item.id === 'tickets'" class="nav-count">{{
            state.tickets.filter((t) => t.state !== "resolved").length
          }}</span></a
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-tip">
          <span class="tip-icon"
            ><Icon
              :name="portal === 'supplier' ? 'package' : 'sparkles'" /></span
          ><strong>{{
            portal === "supplier"
              ? "让每次供货更简单"
              : "你的下一台电脑，在这里"
          }}</strong>
          <p>
            {{
              portal === "supplier"
                ? "统一任务、交付和结算，专注做好每一份服务。"
                : "独享环境，自由选择 AI 工具。把精力留给值得创造的事。"
            }}
          </p>
          <a :href="portal === 'supplier' ? '#tasks' : '/web/#marketplace'"
            >{{ portal === "supplier" ? "查看供货任务" : "探索电脑配置" }}
            <Icon name="arrowRight" :size="14"
          /></a>
        </div>
        <a class="support-link" href="/web/#tickets"
          ><Icon name="help" /><span>需要帮助？联系支持</span
          ><Icon name="external" :size="13"
        /></a>
        <div class="version-row">
          <span><i></i> 交互演示环境</span
          ><button
            @click="
              askConfirm(
                '恢复全部演示数据？浏览器内的演示订单和更改将被清除。',
                resetDemo,
              )
            "
          >
            重置数据
          </button>
        </div>
      </div>
    </aside>
    <div class="main-column">
      <header class="topbar">
        <div class="breadcrumb">
          <button
            class="icon-button menu-trigger"
            aria-label="展开导航"
            @click="ui.sidebarOpen = !ui.sidebarOpen"
          >
            <Icon name="menu" /></button
          ><Icon name="layers" :size="16" /><span>{{
            portalLabel(portal)
          }}</span
          ><Icon name="chevronRight" :size="13" /><strong>{{
            currentPage
          }}</strong>
        </div>
        <div class="topbar-actions">
          <a class="quiet-link" href="/web/#marketplace"
            ><Icon name="globe" :size="15" /><span>产品网站</span></a
          ><span class="topbar-separator"></span
          ><button
            class="icon-button notification-button"
            aria-label="查看通知"
            @click="
              notify(
                '演示通知：你有 ' +
                  state.tasks.filter((t) => t.state === 'reported').length +
                  ' 项供货结果待验收',
              )
            "
          >
            <Icon name="bell" /><i></i>
          </button>
          <div
            v-if="portal === 'web' || portal === 'desktop'"
            class="account-menu"
          >
            <button
              class="account-trigger"
              :aria-expanded="menuOpen"
              @click="menuOpen = !menuOpen"
            >
              <span class="avatar">{{ currentAccount.name.slice(-2) }}</span
              ><span class="account-name"
                >{{ currentAccount.name
                }}<small>{{ isMain ? "主账号" : "子账号" }}</small></span
              ><Icon name="chevronDown" :size="14" />
            </button>
            <div v-if="menuOpen" class="dropdown-panel">
              <p>切换已保存的演示账号</p>
              <button
                v-for="member in state.members"
                :key="member.id"
                :disabled="!member.enabled"
                @click="
                  safely(() => switchAccount(member.id));
                  menuOpen = false;
                "
              >
                <span class="avatar small">{{ member.name.slice(-2) }}</span
                ><span
                  >{{ member.name
                  }}<small
                    >{{ member.role === "main" ? "主账号" : "子账号" }} ·
                    {{ member.email }}</small
                  ></span
                ><Icon
                  v-if="member.id === state.currentAccountId"
                  name="check"
                  :size="15"
                />
              </button>
              <a class="support-link" href="#login" @click="menuOpen = false"
                ><Icon name="plus" :size="14" />添加其他账号／查看登录</a
              >
              <div class="dropdown-note">每个账号只访问自己获分配的电脑。</div>
            </div>
          </div>
          <span v-else class="avatar">{{
            portal === "admin" ? "运营" : "供方"
          }}</span>
        </div>
      </header>
      <div class="demo-notice">
        <span><Icon name="activity" :size="14" /> 交互演示</span>
        <p>示例数据仅保存在本机，不产生真实收款、订阅开通或远控操作。</p>
        <div class="portal-links">
          <a href="/web/" :class="{ selected: portal === 'web' }">客户端网页</a
          ><a href="/admin/" :class="{ selected: portal === 'admin' }">管理端</a
          ><a href="/supplier/" :class="{ selected: portal === 'supplier' }"
            >供应商端</a
          ><a
            href="/client/preview/"
            :class="{ selected: portal === 'desktop' }"
            >桌面预览</a
          >
        </div>
      </div>
      <main
        id="main-content"
        class="content"
        :class="{ 'desktop-content': route === 'desktop' }"
      >
        <EmptyState
          v-if="forbidden"
          title="此页面需要主账号"
          description="子账号使用自己的电脑；购买和团队管理由主账号处理。"
          icon="lock"
          ><button class="button primary" @click="navigate('machines')">
            回到我的电脑
          </button></EmptyState
        >
        <template v-else-if="portal === 'admin'"
          ><Orders v-if="route === 'orders'" admin /><Tickets
            v-else-if="route === 'tickets'"
            admin /><Marketplace
            v-else-if="route === 'products'"
            admin /><AdminDesk v-else :page="route"
        /></template>
        <SupplierDesk v-else-if="portal === 'supplier'" :page="route" />
        <template v-else>
          <Auth v-if="route === 'login'" />
          <Overview v-else-if="route === 'overview'" />
          <Marketplace v-else-if="route === 'marketplace'" />
          <Machines
            v-else-if="route === 'machines'"
            :desktop="portal === 'desktop'"
          />
          <Team v-else-if="route === 'team'" />
          <Orders v-else-if="route === 'orders'" />
          <Tickets v-else-if="route === 'tickets'" />
          <Settings
            v-else-if="route === 'settings' || route === 'accounts'"
            :desktop="portal === 'desktop'"
            :accounts="route === 'accounts'"
          />
          <Desktop v-else-if="route === 'desktop'" />
          <EmptyState
            v-else
            title="页面不存在"
            description="请从侧栏选择功能。"
            icon="search"
          />
        </template>
      </main>
      <footer class="page-footer">
        <span>© {{ new Date().getFullYear() }} Thinkpasser</span
        ><span>独享电脑 · 连接更多可能</span
        ><a href="/web/#tickets">服务支持 <Icon name="arrowUp" :size="12" /></a>
      </footer>
    </div>
    <Dialogs :portal="portal" />
    <Transition name="toast"
      ><div v-if="ui.toast" class="toast" :class="ui.toastTone" role="status">
        <Icon :name="ui.toastTone === 'red' ? 'alert' : 'success'" /><span>{{
          ui.toast
        }}</span
        ><button aria-label="关闭提示" @click="ui.toast = ''">
          <Icon name="x" :size="15" />
        </button></div
    ></Transition>
  </div>
</template>
