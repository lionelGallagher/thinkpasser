<script setup lang="ts">
import { ref } from "vue";
import Icon from "../../shared/Icon.vue";
import Status from "../../shared/Status.vue";
import {
  state,
  currentAccount,
  accountLabel,
  isTeam,
  upgradeToTeam,
  notify,
  switchAccount,
  safely,
} from "../../shared/store";
defineProps<{ desktop?: boolean; accounts?: boolean }>();
const systemAudio = ref(true),
  clipboard = ref(true),
  quality = ref("balanced"),
  password = ref("");
function savePassword() {
  if (password.value.length < 12) {
    notify("演示密码至少需要12位", true);
    return;
  }
  currentAccount.value.firstLogin = false;
  password.value = "";
  notify("演示首次改密状态已更新；密码未保存，真实认证待接入");
}
</script>
<template>
  <section class="page-heading">
    <div>
      <h1>
        {{ accounts ? "账号管理" : desktop ? "客户端设置" : "账号设置" }}
      </h1>
      <p>
        {{
          accounts
            ? "保存不同身份，随时切换；每个账号的权限独立。"
            : "按你的习惯，准备舒适的工作环境。"
        }}
      </p>
    </div>
  </section>
  <section v-if="accounts" class="panel">
    <div class="panel-heading">
      <div>
        <h2>已保存的演示账号</h2>
        <p>切换账号将结束当前桌面预览，不合并资源。</p>
      </div>
    </div>
    <button
      v-for="member in state.members"
      :key="member.id"
      class="saved-account-row"
      :disabled="!member.enabled"
      @click="safely(() => switchAccount(member.id))"
    >
      <span class="avatar">{{ member.name.slice(-2) }}</span>
      <div>
        <strong>{{ member.name }}</strong
        ><small>{{ member.email }}</small>
      </div>
      <Status
        :tone="member.id === state.currentAccountId ? 'green' : 'neutral'"
        >{{
          member.id === state.currentAccountId
            ? "当前账号"
            : member.role === "main"
              ? "主账号"
              : "子账号"
        }}</Status
      ><Icon name="arrowRight" :size="16" />
    </button>
  </section>
  <div v-else class="settings-grid">
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>远控偏好</h2>
          <p>这里只保存本机界面偏好；真实能力由会话授权决定。</p>
        </div>
      </div>
      <div class="setting-row">
        <div>
          <strong>系统声音</strong>
          <p>播放被控电脑的系统输出声音</p>
        </div>
        <label class="toggle"
          ><input
            v-model="systemAudio"
            type="checkbox"
            aria-label="系统声音" /><span></span
        ></label>
      </div>
      <div class="setting-row">
        <div>
          <strong>剪贴板</strong>
          <p>会话授权通过后同步允许的内容</p>
        </div>
        <label class="toggle"
          ><input
            v-model="clipboard"
            type="checkbox"
            aria-label="剪贴板" /><span></span
        ></label>
      </div>
      <div class="setting-row">
        <div>
          <strong>画面偏好</strong>
          <p>实际编码格式需要两端能力协商</p>
        </div>
        <select v-model="quality" aria-label="画面偏好">
          <option value="balanced">平衡</option>
          <option value="quality">画质优先</option>
          <option value="speed">流畅优先</option>
        </select>
      </div>
      <div class="settings-footer">
        <button
          class="button primary"
          @click="notify('演示偏好已保存到当前页面；未改变真实远控配置')"
        >
          保存偏好
        </button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>当前平台账号</h2>
          <p>平台登录凭据与机器连接密码分别管理。</p>
        </div>
      </div>
      <div class="profile-summary">
        <span class="avatar large">{{ currentAccount.name.slice(-2) }}</span>
        <h3>{{ currentAccount.name }}</h3>
        <p>{{ currentAccount.email }}</p>
        <Status :tone="currentAccount.firstLogin ? 'amber' : 'green'">{{
          currentAccount.firstLogin ? "首次登录需要修改密码" : accountLabel
        }}</Status>
      </div>
      <form
        v-if="currentAccount.firstLogin"
        class="profile-password"
        @submit.prevent="savePassword"
      >
        <label
          >设置新的演示密码<input
            v-model="password"
            type="password"
            minlength="12"
            placeholder="至少12位，不会保存明文"
            required /></label
        ><button class="button primary" type="submit">完成演示改密</button>
      </form>
      <button v-if="!isTeam" class="button" @click="upgradeToTeam">
        开通团队空间
      </button>
      <p class="settings-explainer">
        <Icon name="shield" :size="16" />平台登录、电脑连接和 AI
        登录分别管理。请保管账号凭据，切换账号不会合并使用权限。
      </p>
    </section>
  </div>
</template>
