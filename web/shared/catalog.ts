import type { Product } from "./models";
import { reactive, watch } from "vue";
const initialProducts: Product[] = [
  {
    id: "mac-us",
    name: "Mac mini · M4",
    os: "macos",
    country: "US",
    region: "洛杉矶",
    cpu: "Apple M4 · 10 核",
    memory: 16,
    disk: 512,
    priceMinor: 29900,
    available: true,
    badge: "开发者之选",
  },
  {
    id: "mac-jp",
    name: "Mac mini · M4",
    os: "macos",
    country: "JP",
    region: "东京",
    cpu: "Apple M4 · 10 核",
    memory: 24,
    disk: 512,
    priceMinor: 39900,
    available: true,
  },
  {
    id: "win-us",
    name: "Windows 开发工作站",
    os: "windows",
    country: "US",
    region: "洛杉矶",
    cpu: "AMD Ryzen · 8 核",
    memory: 32,
    disk: 1024,
    priceMinor: 32900,
    available: true,
  },
  {
    id: "mac-sg",
    name: "Mac mini · M4 Pro",
    os: "macos",
    country: "SG",
    region: "新加坡",
    cpu: "Apple M4 Pro · 12 核",
    memory: 48,
    disk: 1024,
    priceMinor: 69900,
    available: true,
    badge: "高性能",
  },
  {
    id: "win-de",
    name: "Windows 开发工作站",
    os: "windows",
    country: "DE",
    region: "法兰克福",
    cpu: "Intel Core · 8 核",
    memory: 32,
    disk: 1024,
    priceMinor: 35900,
    available: true,
  },
  {
    id: "mac-de",
    name: "Mac mini · M4",
    os: "macos",
    country: "DE",
    region: "法兰克福",
    cpu: "Apple M4 · 10 核",
    memory: 16,
    disk: 512,
    priceMinor: 31900,
    available: false,
  },
];
function loadProducts(): Product[] {
  try {
    const raw = JSON.parse(
      localStorage.getItem("thinkpasser.catalog.v1") || "null",
    );
    if (
      Array.isArray(raw) &&
      raw.length === initialProducts.length &&
      initialProducts.every((seed) =>
        raw.some(
          (item) =>
            item.id === seed.id &&
            typeof item.name === "string" &&
            typeof item.cpu === "string" &&
            Number.isSafeInteger(item.priceMinor) &&
            item.priceMinor > 0 &&
            Number.isInteger(item.memory) &&
            item.memory > 0 &&
            Number.isInteger(item.disk) &&
            item.disk > 0 &&
            typeof item.available === "boolean",
        ),
      )
    )
      return raw;
  } catch {}
  return structuredClone(initialProducts);
}
export const products = reactive<Product[]>(loadProducts());
watch(
  products,
  (value) => {
    try {
      localStorage.setItem("thinkpasser.catalog.v1", JSON.stringify(value));
    } catch {}
  },
  { deep: true },
);
export function resetCatalog() {
  products.splice(0, products.length, ...structuredClone(initialProducts));
}
function onCatalogStorage(event: StorageEvent) {
  if (event.key !== "thinkpasser.catalog.v1" || !event.newValue) return;
  const incoming = loadProducts();
  if (JSON.stringify(products) !== JSON.stringify(incoming))
    products.splice(0, products.length, ...incoming);
}
window.addEventListener("storage", onCatalogStorage);
if (import.meta.hot)
  import.meta.hot.dispose(() =>
    window.removeEventListener("storage", onCatalogStorage),
  );
