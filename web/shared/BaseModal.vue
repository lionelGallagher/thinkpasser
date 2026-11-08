<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, useId } from "vue";
import Icon from "./Icon.vue";
defineProps<{ title: string; eyebrow?: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>(),
  dialog = ref<HTMLDialogElement>();
const headingId = "modal-" + useId();
function outside(event: MouseEvent) {
  if (event.target === dialog.value) emit("close");
}
onMounted(() => {
  dialog.value?.showModal();
  document.body.style.overflow = "hidden";
});
onBeforeUnmount(() => {
  document.body.style.overflow = "";
});
</script>
<template>
  <dialog
    ref="dialog"
    class="modal"
    :class="{ wide }"
    :aria-labelledby="headingId"
    @cancel.prevent="emit('close')"
    @click="outside"
  >
    <section class="modal-card">
      <header class="modal-head">
        <div>
          <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
          <h2 :id="headingId">{{ title }}</h2>
        </div>
        <button
          class="icon-button"
          aria-label="关闭弹窗"
          @click="emit('close')"
        >
          <Icon name="x" />
        </button>
      </header>
      <slot />
    </section>
  </dialog>
</template>
