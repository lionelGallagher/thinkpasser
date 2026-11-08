<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "../../shared/Icon.vue";
import Status from "../../shared/Status.vue";
import EmptyState from "../../shared/EmptyState.vue";
import ProductEditor from "../ProductEditor.vue";
import { products } from "../../shared/catalog";
import {
  AI_NAME,
  AI_PRICE,
  COUNTRY,
  money,
  type AI,
  type Product,
} from "../../shared/models";
import { isMain, openDialog, notify } from "../../shared/store";
const props = defineProps<{ admin?: boolean }>();
const editing = ref<Product | null>(null);
const os = ref("all"),
  country = ref("all"),
  search = ref(""),
  selectedAi = ref<AI[]>([]);
const filtered = computed(() =>
  products.filter(
    (p) =>
      (os.value === "all" || p.os === os.value) &&
      (country.value === "all" || p.country === country.value) &&
      (!search.value ||
        [p.name, p.region, p.cpu]
          .join(" ")
          .toLowerCase()
          .includes(search.value.toLowerCase())),
  ),
);
function choose(id: string) {
  if (props.admin) {
    editing.value = products.find((p) => p.id === id) || null;
    return;
  }
  if (!isMain.value) {
    notify("购买由主账号操作", true);
    return;
  }
  sessionStorage.setItem(
    "thinkpasser.selected-ai",
    JSON.stringify(selectedAi.value),
  );
  openDialog("checkout", id, "new");
}
</script>
<template>
  <section class="page-heading">
    <div>
      <h1>
        {{ admin ? "商品管理" : "选择电脑" }}
      </h1>
      <p>
        {{
          admin
            ? "维护客户看到的配置与 AI 组合，成交订单使用购买时快照。"
            : "选择配置和地区，AI 工具可选。"
        }}
      </p>
    </div>
    <span class="heading-note"
      ><Icon name="shield" :size="15" />以下为演示配置与价格</span
    >
  </section>
  <div v-if="!admin" class="catalog-intro">
    <div>
      <h3>AI 工具</h3>
      <p>按需选择，可不购买。</p>
    </div>
    <div class="ai-choice-row">
      <label
        v-for="provider in ['claude', 'codex'] as AI[]"
        :key="provider"
        class="ai-choice"
        :class="{ selected: selectedAi.includes(provider) }"
        ><input type="checkbox" v-model="selectedAi" :value="provider" /><span
          class="ai-glyph"
          :class="provider"
          >{{ provider === "claude" ? "✳" : "⌘" }}</span
        ><span
          >{{ AI_NAME[provider]
          }}<small>+ {{ money(AI_PRICE[provider]) }} / 标准30天</small></span
        ><Icon
          :name="selectedAi.includes(provider) ? 'success' : 'plus'"
          :size="17"
      /></label>
    </div>
  </div>
  <div class="filter-bar">
    <div class="segmented" aria-label="操作系统筛选">
      <button
        v-for="item in [
          { id: 'all', label: '全部电脑' },
          { id: 'macos', label: 'macOS' },
          { id: 'windows', label: 'Windows' },
        ]"
        :key="item.id"
        :class="{ selected: os === item.id }"
        @click="os = item.id"
      >
        {{ item.label }}
      </button>
    </div>
    <div class="filter-controls">
      <label class="search-field"
        ><Icon name="search" :size="16" /><input
          v-model="search"
          placeholder="搜索配置或地区"
          aria-label="搜索电脑" /></label
      ><label class="select-wrap"
        ><Icon name="globe" :size="16" /><select
          v-model="country"
          aria-label="地区筛选"
        >
          <option value="all">所有地区</option>
          <option v-for="(item, key) in COUNTRY" :value="key" :key="key">
            {{ item.label }}
          </option>
        </select></label
      >
    </div>
  </div>
  <div class="results-caption">
    <span
      >找到 <strong>{{ filtered.length }}</strong> 款配置</span
    ><span>独享硬件环境 · 整套验收后起租</span>
  </div>
  <div v-if="filtered.length" class="product-grid">
    <article
      v-for="product in filtered"
      :key="product.id"
      class="product-card"
      :class="{ unavailable: !product.available }"
    >
      <div class="product-identity">
        <span>{{ product.os === "macos" ? "macOS" : "Windows" }}</span
        ><span
          >{{ COUNTRY[product.country]?.label }} · {{ product.region }}</span
        >
      </div>
      <div class="product-content">
        <div class="product-title-row">
          <h2>{{ product.name }}</h2>
          <Status :tone="product.available ? 'green' : 'neutral'" :dot="true">{{
            product.available ? "可准备" : "暂时缺货"
          }}</Status>
        </div>
        <p class="product-subtitle">
          {{
            product.os === "macos"
              ? "macOS 独享开发环境"
              : "Windows 独享开发环境"
          }}
        </p>
        <ul class="spec-list">
          <li><Icon name="cpu" :size="16" />{{ product.cpu }}</li>
          <li>
            <Icon name="memory" :size="16" />{{ product.memory }} GB
            {{ product.os === "macos" ? "统一内存" : "内存" }}
          </li>
          <li>
            <Icon name="disk" :size="16" />{{
              product.disk >= 1024 ? "1 TB" : product.disk + " GB"
            }}
            SSD
          </li>
        </ul>
        <div class="product-tools">
          <span v-if="!selectedAi.length">纯电脑 · AI 可后续加购</span
          ><span
            v-for="provider in selectedAi"
            :key="provider"
            class="tool-tag"
            :class="provider"
            >{{ provider === "claude" ? "✳" : "⌘" }}
            {{ AI_NAME[provider] }}</span
          >
        </div>
        <div class="product-price">
          <div>
            <span>¥</span
            ><strong>{{
              (
                (product.priceMinor +
                  selectedAi.reduce((n, a) => n + AI_PRICE[a], 0)) /
                100
              ).toLocaleString("zh-CN")
            }}</strong
            ><small>/ 30 天</small>
          </div>
          <button
            class="button"
            :class="{ primary: product.available }"
            :disabled="!admin && !product.available"
            @click="choose(product.id)"
          >
            {{ admin ? "查看配置" : product.available ? "选择配置" : "暂时缺货"
            }}<Icon v-if="product.available" name="arrowRight" :size="15" />
          </button>
        </div>
      </div>
    </article>
  </div>
  <EmptyState
    v-else
    title="没有找到匹配的电脑"
    description="试试其他系统、地区或搜索词。"
    icon="search"
    ><button
      class="button"
      @click="
        os = 'all';
        country = 'all';
        search = '';
      "
    >
      清除筛选
    </button></EmptyState
  >
  <ProductEditor v-if="editing" :product="editing" @close="editing = null" />
</template>
