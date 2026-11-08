<script setup lang="ts">
withDefaults(defineProps<{ tone?: string; dot?: boolean }>(), {
  tone: "neutral",
  dot: true,
});
</script>
<template>
  <span class="status" :class="'status-' + tone"
    ><i v-if="dot"></i><slot
  /></span>
</template>
