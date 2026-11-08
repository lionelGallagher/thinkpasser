<script setup lang="ts">
import { ref } from "vue";
import BaseModal from "../shared/BaseModal.vue";
import Icon from "../shared/Icon.vue";
import { products } from "../shared/catalog";
import { notify } from "../shared/store";
import { COUNTRY, type Product } from "../shared/models";
const props = defineProps<{ product: Product }>(),
  emit = defineEmits<{ close: [] }>();
const name = ref(props.product.name),
  cpu = ref(props.product.cpu),
  memory = ref(props.product.memory),
  disk = ref(props.product.disk),
  region = ref(props.product.region),
  country = ref(props.product.country),
  price = ref(props.product.priceMinor / 100),
  available = ref(props.product.available),
  error = ref("");
function save() {
  error.value = "";
  if (
    !name.value.trim() ||
    !cpu.value.trim() ||
    !region.value.trim() ||
    !Number.isInteger(memory.value) ||
    memory.value <= 0 ||
    !Number.isInteger(disk.value) ||
    disk.value <= 0 ||
    !Number.isSafeInteger(Math.round(price.value * 100)) ||
    price.value <= 0
  ) {
    error.value = "请检查名称、配置和正数价格";
    return;
  }
  const target = products.find((p) => p.id === props.product.id)!;
  Object.assign(target, {
    name: name.value.trim(),
    cpu: cpu.value.trim(),
    memory: memory.value,
    disk: disk.value,
    region: region.value.trim(),
    country: country.value,
    priceMinor: Math.round(price.value * 100),
    available: available.value,
  });
  notify("演示商品配置已保存；原订单快照保持原成交信息");
  emit("close");
}
</script>
<template>
  <BaseModal title="编辑商品配置" @close="emit('close')"
    ><form class="modal-form" @submit.prevent="save">
      <label class="field"
        >商品名称<input v-model="name" required maxlength="60" /></label
      ><label class="field"
        >CPU 说明<input v-model="cpu" required maxlength="60"
      /></label>
      <div class="form-grid">
        <label class="field"
          >内存 / GB<input
            v-model.number="memory"
            type="number"
            required
            min="1"
            step="1" /></label
        ><label class="field"
          >硬盘 / GB<input
            v-model.number="disk"
            type="number"
            required
            min="1"
            step="1"
        /></label>
      </div>
      <div class="form-grid">
        <label class="field"
          >国家或地区<select v-model="country">
            <option v-for="(item, key) in COUNTRY" :key="key" :value="key">
              {{ item.label }}
            </option>
          </select></label
        ><label class="field">城市<input v-model="region" required /></label>
      </div>
      <label class="field"
        >电脑30天售价 / 人民币元<input
          v-model.number="price"
          type="number"
          required
          min="0.01"
          step="0.01" /></label
      ><label class="radio-option"
        ><input v-model="available" type="checkbox" /><span
          ><strong>演示中允许准备此配置</strong
          ><small>正式上架仍需真实库存和交付能力核验。</small></span
        ></label
      >
      <p class="product-editor-note">
        更改作用于之后的演示报价。已创建的订单金额和已交付电脑配置保留快照，真实商品管理等待Java后端接入。
      </p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="button" type="button" @click="emit('close')">取消</button
        ><button class="button primary" type="submit">
          保存演示配置 <Icon name="check" :size="15" />
        </button>
      </div></form
  ></BaseModal>
</template>
