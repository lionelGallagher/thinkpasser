<script setup lang="ts">
import Icon from "./Icon.vue";
defineProps<{ title: string; description?: string; icon?: string }>();
</script>
<template>
  <div class="empty-state">
    <span class="empty-icon"><Icon :name="icon || 'boxes'" :size="26" /></span>
    <h3>{{ title }}</h3>
    <p>{{ description || "这里暂时没有记录。" }}</p>
    <slot />
  </div>
</template>
