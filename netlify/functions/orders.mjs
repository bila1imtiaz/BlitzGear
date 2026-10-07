import { getCatalog, ordersStore, latest, newKey, clean, json } from "../lib/db.mjs";

export default async (req) => {
  const store = ordersStore();

  if (req.method === "GET") {
    const orders = await latest(store, 10);
    // only public-safe fields
    return json(orders.map(o => ({ id: o.id, customer: o.customer, items: o.items, total: o.total, createdAt: o.createdAt })));
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const customer = clean(body.customer, 40);
    if (customer.length < 2) return json({ error: "Please enter your name." }, 400);
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50)
      return json({ error: "Cart is empty." }, 400);

    // Prices come from the database, never from the browser.
    const catalog = await getCatalog();
    const items = [];
    let total = 0;
    for (const line of body.items) {
      const p = catalog.find(x => x.id === Number(line.id));
      const qty = Math.floor(Number(line.qty));
      if (!p || !(qty >= 1 && qty <= 99)) return json({ error: "Invalid item in cart." }, 400);
      items.push({ id: p.id, name: p.name, qty, price: p.price });
      total += p.price * qty;
    }

    const key = newKey();
    const order = { id: key, customer, items, total, createdAt: new Date().toISOString() };
    await store.setJSON(key, order);
    return json(order, 201);
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/orders" };
