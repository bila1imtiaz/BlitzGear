// Shared helpers for the Netlify Functions (database = Netlify Blobs)
import { getStore } from "@netlify/blobs";

export const SEED_PRODUCTS = [
  { id: 1, name: "Glorious Model D minus", category: "Mouse", price: 15000, icon: "🖱️", desc: "Ultralight honeycomb gaming mouse." },
  { id: 2, name: "Logitech G Pro Superlight", category: "Mouse", price: 35000, icon: "🖱️", desc: "Wireless esports mouse under 65 g." },
  { id: 3, name: "Mechanical Keyboard 75%", category: "Keyboard", price: 22000, icon: "⌨️", desc: "Hot-swappable switches, compact layout." },
  { id: 4, name: "Wireless Headset", category: "Audio", price: 18000, icon: "🎧", desc: "Low-latency 2.4 GHz with clear mic." },
  { id: 5, name: "XL Cloth Mousepad", category: "Accessory", price: 3500, icon: "🟦", desc: "Smooth glide surface, stitched edges." },
  { id: 6, name: '27" 165Hz Monitor', category: "Display", price: 62000, icon: "🖥️", desc: "IPS panel with adaptive sync." },
  { id: 7, name: "USB-C Hub 7-in-1", category: "Accessory", price: 6500, icon: "🔌", desc: "HDMI, USB 3.0, SD card and PD charging." },
  { id: 8, name: "HD Webcam 1080p", category: "Video", price: 9000, icon: "📷", desc: "Autofocus webcam with dual microphones." }
];

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });

export const productsStore = () => getStore("products");
export const ordersStore = () => getStore("orders");
export const messagesStore = () => getStore("messages");

// Returns the catalog; seeds the database the first time it is requested.
export async function getCatalog() {
  const store = productsStore();
  let catalog = await store.get("catalog", { type: "json" });
  if (!catalog) {
    catalog = SEED_PRODUCTS;
    await store.setJSON("catalog", catalog);
  }
  return catalog;
}

// Newest-first list of JSON records stored under keys "<prefix><timestamp>-<rand>".
export async function latest(store, limit = 10) {
  const { blobs } = await store.list();
  const keys = blobs.map(b => b.key).sort().slice(-limit).reverse();
  const rows = await Promise.all(keys.map(k => store.get(k, { type: "json" })));
  return rows.filter(Boolean);
}

export const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const clean = (v, max) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
