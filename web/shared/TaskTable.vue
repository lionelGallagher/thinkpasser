<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "./Icon.vue";
import Status from "./Status.vue";
import EmptyState from "./EmptyState.vue";
import { state, ui, acceptTask, verifyTask, openDialog, safely } from "./store";
import { AI_NAME, date, money } from "./models";
const props = defineProps<{ supplier?: boolean }>(),
  filter = ref("all");
const tasks = computed(() =>
  state.tasks.filter(
    (t) =>
      (!props.supplier || t.supplierId === ui.supplierId) &&
      (filter.value === "all" || t.state === filter.value),
  ),
);
const labels: Record<string, string> = {
  offered: "待接单",
  accepted: "准备中",
  reported: "待平台验收",
  verified: "已验收",
  failed: "准备失败",
};
const tones: Record<string, string> = {
  offered: "amber",
  accepted: "blue",
  reported: "purple",
  verified: "green",
  failed: "red",
};
</script>
<template>
  <div class="filter-bar">
    <div class="segmented">
      <button
        v-for="f in [
          { id: 'all', label: '全部任务' },
          { id: 'offered', label: '待接单' },
          { id: 'accepted', label: '准备中' },
          { id: 'reported', label: '待验收' },
          { id: 'verified', label: '已验收' },
        ]"
        :key="f.id"
        :class="{ selected: filter === f.id }"
        @click="filter = f.id"
      >
        {{ f.label }}
      </button>
    </div>
    <span class="small-muted">{{ tasks.length }} 项任务</span>
  </div>
  <div class="panel table-scroll">
    <table class="data-table task-table">
      <thead>
        <tr>
          <th>任务与订单</th>
          <th>{{ supplier ? "交付目标" : "负责供应商" }}</th>
          <th>状态</th>
          <th>承诺回报时间</th>
          <th>供货成本</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="task in tasks" :key="task.id">
          <td>
            <div class="table-device">
              <span
                class="task-icon"
                :class="{ subscription: task.kind !== 'computer_prepare' }"
                ><Icon
                  :name="
                    task.kind === 'computer_prepare' ? 'server' : 'sparkles'
                  "
                  :size="18" /></span
              ><span
                ><strong>{{
                  task.kind === "computer_prepare"
                    ? "电脑准备"
                    : AI_NAME[task.kind] + " 开通"
                }}</strong
                ><small>{{ task.id }} · {{ task.orderId }}</small></span
              >
            </div>
          </td>
          <td>
            <template v-if="supplier"
              ><strong class="table-plain">{{
                task.targetEmail ||
                state.machines.find((m) => m.id === task.machineId)?.code
              }}</strong
              ><small class="table-small">{{
                task.kind === "computer_prepare"
                  ? "配置、环境与远控能力验收"
                  : "指定账号，不可替换成其他现成账号"
              }}</small></template
            ><template v-else
              ><strong class="table-plain">{{
                state.suppliers.find((s) => s.id === task.supplierId)?.name
              }}</strong
              ><small class="table-small">{{
                task.kind === "computer_prepare" ? "电脑侧" : "卡／订阅侧"
              }}</small></template
            >
          </td>
          <td>
            <Status :tone="tones[task.state]">{{ labels[task.state] }}</Status>
          </td>
          <td>
            {{ date(task.deadline, true)
            }}<small class="table-small">以实际任务承诺为准</small>
          </td>
          <td>
            {{ money(task.costMinor)
            }}<small class="table-small">演示成本</small>
          </td>
          <td>
            <div class="table-actions">
              <button
                v-if="supplier && task.state === 'offered'"
                class="button small primary"
                @click="safely(() => acceptTask(task.id))"
              >
                接单</button
              ><button
                v-else-if="
                  supplier && ['accepted', 'failed'].includes(task.state)
                "
                class="button small"
                @click="openDialog('report', task.id)"
              >
                回报结果</button
              ><button
                v-else-if="!supplier && task.state === 'reported'"
                class="button small primary"
                @click="safely(() => verifyTask(task.id))"
              >
                演示验收</button
              ><a
                v-else-if="!supplier && task.state === 'verified'"
                href="#orders"
                class="text-link"
                >交付进度 <Icon name="arrowUp" :size="13" /></a
              ><span v-else class="small-muted">{{
                task.state === "verified"
                  ? "记录已归档"
                  : task.state === "reported"
                    ? "等待平台验收"
                    : "等待供应商准备"
              }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <EmptyState
      v-if="!tasks.length"
      title="暂无符合条件的供货任务"
      description="新任务会按当前供方和筛选条件显示。"
      icon="package"
    />
  </div>
  <div class="inline-note">
    <Icon
      name="shield"
      :size="16"
    />供应商提交结果后仍需平台验收；电脑与本次所购 AI 全部就绪后才开放首次交付。
  </div>
</template>
