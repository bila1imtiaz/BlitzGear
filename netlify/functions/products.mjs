import { getCatalog, json } from "../lib/db.mjs";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  return json(await getCatalog());
};

export const config = { path: "/api/products" };
