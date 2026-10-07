import { messagesStore, latest, newKey, clean, json } from "../lib/db.mjs";

export default async (req) => {
  const store = messagesStore();

  if (req.method === "GET") {
    const rows = await latest(store, 10);
    // email is stored but never sent back to visitors
    return json(rows.map(m => ({ id: m.id, name: m.name, message: m.message, createdAt: m.createdAt })));
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const name = clean(body.name, 60);
    const email = clean(body.email, 120);
    const message = clean(body.message, 500);
    if (name.length < 2) return json({ error: "Name is too short." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email." }, 400);
    if (message.length < 10) return json({ error: "Message is too short." }, 400);

    const key = newKey();
    const row = { id: key, name, email, message, createdAt: new Date().toISOString() };
    await store.setJSON(key, row);
    return json({ id: key, name, message, createdAt: row.createdAt }, 201);
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/messages" };
