import { onBeforeUnmount, onMounted, ref } from "vue";

/** UI countdown only. Production permission decisions remain server/device checks. */
export function useNow() {
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | undefined;
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
  });
  return now;
}
