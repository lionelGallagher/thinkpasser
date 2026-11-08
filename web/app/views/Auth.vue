<script setup lang="ts">
import { ref } from "vue";
import Icon from "../../shared/Icon.vue";
import { state, switchAccount, notify } from "../../shared/store";
const method = ref<"password" | "code">("password"),
  email = ref("zhou@example.invalid"),
  password = ref(""),
  code = ref(""),
  error = ref(""),
  sent = ref(false),
  register = ref(false),
  name = ref("");
function send() {
  if (!email.value.includes("@")) {
    error.value = "请填写有效邮箱";
    return;
  }
  sent.value = true;
  error.value = "";
  notify("仅演示验证码为123456；没有发送真实邮件");
}
function submit() {
  error.value = "";
  if (register.value) {
    if (
      !name.value.trim() ||
      password.value.length < 12 ||
      code.value !== "123456"
    ) {
      error.value = "请填写姓名、至少12位密码和演示验证码123456";
      return;
    }
    error.value =
      "注册表单已验证。真实账号注册与邮箱验证服务待后端接入，未创建真实账号。";
    return;
  }
  const member = state.members.find(
    (m) => m.email.toLowerCase() === email.value.toLowerCase(),
  );
  if (!member || !member.enabled) {
    error.value = "此邮箱不在已启用的演示账号中";
    return;
  }
  if (
    (method.value === "password" && password.value !== "demo-pass-123") ||
    (method.value === "code" && code.value !== "123456")
  ) {
    error.value =
      method.value === "password"
        ? "演示密码为 demo-pass-123"
        : "演示验证码为123456";
    return;
  }
  switchAccount(member.id);
  if (member.firstLogin) location.hash = "settings";
}
</script>
<template>
  <div class="auth-layout">
    <section class="auth-form-panel">
      <h2>{{ register ? "创建工作空间" : "登录你的工作空间" }}</h2>
      <p class="auth-subtitle">当前为界面演示，不会发送邮件或创建真实登录。</p>
      <div v-if="!register" class="segmented">
        <button
          :class="{ selected: method === 'password' }"
          @click="
            method = 'password';
            error = '';
          "
        >
          邮箱密码</button
        ><button
          :class="{ selected: method === 'code' }"
          @click="
            method = 'code';
            error = '';
          "
        >
          邮箱验证码
        </button>
      </div>
      <form @submit.prevent="submit">
        <label v-if="register" class="field"
          >你的姓名<input
            v-model="name"
            required
            placeholder="如何称呼你" /></label
        ><label class="field"
          >邮箱<input
            v-model="email"
            type="email"
            required
            autocomplete="username"
            placeholder="you@example.com" /></label
        ><label v-if="method === 'password' || register" class="field"
          >{{ register ? "设置密码" : "密码"
          }}<input
            v-model="password"
            type="password"
            required
            :minlength="register ? 12 : 1"
            :autocomplete="register ? 'new-password' : 'current-password'"
            :placeholder="
              register ? '至少12位' : '演示密码：demo-pass-123'
            " /></label
        ><label v-if="method === 'code' || register" class="field"
          >验证码
          <div class="code-input-row">
            <input
              v-model="code"
              required
              maxlength="6"
              placeholder="演示验证码123456"
            /><button class="button" type="button" @click="send">
              {{ sent ? "重新生成提示" : "获取演示验证码" }}
            </button>
          </div></label
        >
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="button primary block" type="submit">
          {{ register ? "验证注册表单" : "登录演示工作空间"
          }}<Icon name="arrowRight" :size="15" />
        </button>
      </form>
      <p class="auth-alternate">
        {{ register ? "已有平台账号？" : "还没有工作空间？"
        }}<button
          class="text-link"
          @click="
            register = !register;
            error = '';
          "
        >
          {{ register ? "返回登录" : "查看注册界面" }}
        </button>
      </p>
      <div class="auth-demo-accounts">
        <strong>可用的演示邮箱</strong
        ><button
          v-for="member in state.members.filter((m) => m.enabled)"
          :key="member.id"
          @click="
            email = member.email;
            register = false;
          "
        >
          {{ member.name }}<span>{{ member.email }}</span
          ><Icon name="arrowUp" :size="13" />
        </button>
      </div>
    </section>
  </div>
</template>
