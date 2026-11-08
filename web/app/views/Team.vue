<script setup lang="ts">
import { ref, computed } from "vue";
import Icon from "../../shared/Icon.vue";
import Status from "../../shared/Status.vue";
import EmptyState from "../../shared/EmptyState.vue";
import {
  state,
  openDialog,
  askConfirm,
  unassign,
  safely,
  notify,
} from "../../shared/store";
const search = ref("");
const members = computed(() =>
  state.members.filter((m) =>
    [m.name, m.email]
      .join(" ")
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
);
function machine(id: string) {
  return state.machines.find(
    (m) => m.assignedTo === id || m.pendingAssignmentTo === id,
  );
}
function disable(id: string) {
  const member = state.members.find((m) => m.id === id);
  if (!member || member.role === "main") return;
  member.enabled = !member.enabled;
  notify(
    member.enabled ? "演示账号已启用" : "演示账号已停用；真实撤权待后端执行",
  );
}
</script>
<template>
  <section class="page-heading">
    <div>
      <h1>团队与子账号</h1>
      <p>每个人一份独立环境，按团队需要灵活分配。</p>
    </div>
    <button class="button primary" @click="openDialog('member')">
      <Icon name="plus" :size="17" />创建子账号
    </button>
  </section>
  <div class="team-stats">
    <div>
      <span>团队成员</span
      ><strong>{{ state.members.length }}<small>人</small></strong>
    </div>
    <div>
      <span>已分配电脑</span
      ><strong
        >{{ state.machines.filter((m) => m.assignedTo).length
        }}<small>台</small></strong
      >
    </div>
    <div>
      <span>待分配资源</span
      ><strong
        >{{
          state.machines.filter((m) => !m.assignedTo && m.state === "online")
            .length
        }}<small>台</small></strong
      >
    </div>
    <p>
      <Icon name="shield" :size="19" />每个使用账号同时最多分配一台独享电脑。
    </p>
  </div>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <h2>
          成员列表 <span class="count-pill">{{ members.length }}</span>
        </h2>
        <p>直接创建，无需邀请加入</p>
      </div>
      <label class="search-field"
        ><Icon name="search" :size="16" /><input
          v-model="search"
          placeholder="搜索姓名或邮箱"
          aria-label="搜索成员"
      /></label>
    </div>
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>成员</th>
            <th>角色</th>
            <th>状态</th>
            <th>独享电脑</th>
            <th>账号与分配操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.id">
            <td>
              <div class="table-person">
                <span class="avatar">{{ member.name.slice(-2) }}</span>
                <div>
                  <strong>{{ member.name }}</strong
                  ><small>{{ member.email }}</small>
                </div>
              </div>
            </td>
            <td>
              <span
                class="role-tag"
                :class="{ main: member.role === 'main' }"
                >{{ member.role === "main" ? "主账号" : "子账号" }}</span
              >
            </td>
            <td>
              <Status
                :tone="
                  !member.enabled
                    ? 'neutral'
                    : member.firstLogin
                      ? 'amber'
                      : 'green'
                "
                >{{
                  !member.enabled
                    ? "已停用"
                    : member.firstLogin
                      ? "首次需改密码"
                      : "正常"
                }}</Status
              >
            </td>
            <td>
              <div v-if="machine(member.id)" class="table-device">
                <Icon name="monitor" :size="17" /><span
                  >{{ machine(member.id)?.code
                  }}<small>{{
                    machine(member.id)?.pendingAssignmentTo
                      ? "交接处理中"
                      : machine(member.id)?.name
                  }}</small></span
                >
              </div>
              <span v-else class="small-muted">尚未分配</span>
            </td>
            <td>
              <div class="table-actions">
                <button
                  v-if="machine(member.id)"
                  class="text-link"
                  @click="openDialog('assign', machine(member.id)!.id)"
                >
                  调整分配</button
                ><button
                  v-if="machine(member.id)"
                  class="text-link muted"
                  @click="
                    askConfirm(
                      '收回 ' +
                        member.name +
                        ' 的电脑？将保留文件环境并撤销原连接授权。',
                      () => safely(() => unassign(machine(member.id)!.id)),
                    )
                  "
                >
                  收回</button
                ><button
                  v-if="member.role === 'sub'"
                  class="text-link muted"
                  @click="
                    member.firstLogin = true;
                    notify('演示账号已标记首次改密；实际密码重置待后端接入');
                  "
                >
                  重置密码</button
                ><button
                  v-if="member.role === 'sub'"
                  class="text-link"
                  :class="{ danger: member.enabled }"
                  @click="
                    askConfirm(
                      (member.enabled ? '停用' : '启用') +
                        ' ' +
                        member.name +
                        ' 的演示账号？',
                      () => disable(member.id),
                    )
                  "
                >
                  {{ member.enabled ? "停用" : "启用" }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState
      v-if="!members.length"
      title="没有找到成员"
      description="试试其他姓名或邮箱。"
      icon="users"
    />
  </section>
  <div class="two-notes">
    <div>
      <Icon name="users" :size="21" />
      <h3>管理和使用，权限分开</h3>
      <p>
        主账号可买机器、创建子账号和调整分配。进入桌面仍需实际分配给当前账号。
      </p>
    </div>
    <div>
      <Icon name="lock" :size="21" />
      <h3>收回电脑，凭据一起处理</h3>
      <p>可选择保留文件软件或重置环境；旧远控授权及私人登录凭据分别处理。</p>
    </div>
  </div>
</template>
