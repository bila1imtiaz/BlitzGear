"use strict";

/* ---------- Data ---------- */
// Fallback catalog, used only if the database API is unreachable (e.g. opening index.html from disk)
let PRODUCTS = [
  { id: 1, name: "Glorious Model D minus", category: "Mouse", price: 15000, icon: "🖱️", desc: "Ultralight honeycomb gaming mouse." },
  { id: 2, name: "Logitech G Pro Superlight", category: "Mouse", price: 35000, icon: "🖱️", desc: "Wireless esports mouse under 65 g." },
  { id: 3, name: "Mechanical Keyboard 75%", category: "Keyboard", price: 22000, icon: "⌨️", desc: "Hot-swappable switches, compact layout." },
  { id: 4, name: "Wireless Headset", category: "Audio", price: 18000, icon: "🎧", desc: "Low-latency 2.4 GHz with clear mic." },
  { id: 5, name: "XL Cloth Mousepad", category: "Accessory", price: 3500, icon: "🟦", desc: "Smooth glide surface, stitched edges." },
  { id: 6, name: '27" 165Hz Monitor', category: "Display", price: 62000, icon: "🖥️", desc: "IPS panel with adaptive sync." },
  { id: 7, name: "USB-C Hub 7-in-1", category: "Accessory", price: 6500, icon: "🔌", desc: "HDMI, USB 3.0, SD card and PD charging." },
  { id: 8, name: "HD Webcam 1080p", category: "Video", price: 9000, icon: "📷", desc: "Autofocus webcam with dual microphones." }
];

const CLOUD_MODELS = {
  iaas: {
    title: "Infrastructure as a Service (IaaS)",
    text: "Provides basic building blocks: virtual machines, networking and storage. You manage the OS and everything above it.",
    points: ["Highest flexibility and control", "You patch and maintain operating systems", "Example: Amazon EC2, Azure Virtual Machines"]
  },
  paas: {
    title: "Platform as a Service (PaaS)",
    text: "Removes the need to manage servers and operating systems so you can focus on deploying your application. This site runs on Netlify.",
    points: ["Deploy straight from a Git repository", "Build, hosting and HTTPS handled by the platform", "Example: Netlify, Heroku, Google App Engine"]
  },
  saas: {
    title: "Software as a Service (SaaS)",
    text: "Complete applications managed by the vendor and used through a browser. Nothing to install or maintain.",
    points: ["Subscription based access", "Automatic updates and maintenance", "Example: Odoo Inventory, Gmail, Google Docs"]
  }
};

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = n => "Rs. " + n.toLocaleString("en-PK");

let dbOnline = false;

async function api(path, options) {
  const res = await fetch("/api/" + path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
const post = (path, body) => api(path, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

// Escape text coming from the database before putting it into HTML
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const when = iso => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* storage may be blocked; app still works */ }
  return null;
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("#themeToggle").innerHTML = theme === "dark" ? "&#9728;" : "&#9790;";
}
function initTheme() {
  const saved = store("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    store("theme", next);
  });
}

/* ---------- Navigation ---------- */
function initNav() {
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  $$("a", links).forEach(a => a.addEventListener("click", () => {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", false);
  }));

  // highlight the link of the section in view
  const sections = $$("main section[id]");
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        $$("a", links).forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id));
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach(s => obs.observe(s));
}

/* ---------- Products ---------- */
const state = { query: "", category: "all", sort: "featured" };

function visibleProducts() {
  let list = PRODUCTS.filter(p =>
    (state.category === "all" || p.category === state.category) &&
    p.name.toLowerCase().includes(state.query.toLowerCase())
  );
  if (state.sort === "low") list.sort((a, b) => a.price - b.price);
  if (state.sort === "high") list.sort((a, b) => b.price - a.price);
  if (state.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function renderProducts() {
  const grid = $("#productGrid");
  const list = visibleProducts();
  grid.innerHTML = list.map(p => `
    <article class="card">
      <div class="card-art" aria-hidden="true">${p.icon}</div>
      <div class="card-body">
        <span class="tag">${p.category}</span>
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="card-foot">
          <span class="price">${money(p.price)}</span>
          <button class="add-btn" data-id="${p.id}">Add</button>
        </div>
      </div>
    </article>`).join("");
  $("#emptyMsg").hidden = list.length > 0;
}

async function initProducts() {
  try {
    PRODUCTS = await api("products");
    dbOnline = true;
  } catch (e) { /* keep fallback list */ }
  $("#statProducts").textContent = PRODUCTS.length;
  const cats = [...new Set(PRODUCTS.map(p => p.category))].sort();
  $("#category").insertAdjacentHTML("beforeend", cats.map(c => `<option value="${c}">${c}</option>`).join(""));

  $("#search").addEventListener("input", e => { state.query = e.target.value; renderProducts(); });
  $("#category").addEventListener("change", e => { state.category = e.target.value; renderProducts(); });
  $("#sort").addEventListener("change", e => { state.sort = e.target.value; renderProducts(); });
  $("#productGrid").addEventListener("click", e => {
    const btn = e.target.closest(".add-btn");
    if (btn) addToCart(Number(btn.dataset.id));
  });
  renderProducts();
}

/* ---------- Cart ---------- */
let cart = store("cart") || [];   // [{id, qty}]

function saveCart() { store("cart", cart); renderCart(); }

function addToCart(id) {
  const item = cart.find(i => i.id === id);
  item ? item.qty++ : cart.push({ id, qty: 1 });
  saveCart();
  const badge = $("#cartCount");
  badge.classList.remove("bump");
  void badge.offsetWidth;            // restart the animation
  badge.classList.add("bump");
  toast("Added to cart");
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
}

function renderCart() {
  const list = $("#cartList");
  let total = 0, count = 0;
  list.innerHTML = cart.map(({ id, qty }) => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return "";
    total += p.price * qty;
    count += qty;
    return `
      <li class="cart-item">
        <strong>${p.name}</strong>
        <span>${money(p.price * qty)}</span>
        <div class="qty">
          <button data-act="dec" data-id="${id}" aria-label="Decrease quantity">&minus;</button>
          <span>${qty}</span>
          <button data-act="inc" data-id="${id}" aria-label="Increase quantity">+</button>
        </div>
        <button class="remove" data-act="rm" data-id="${id}">Remove</button>
      </li>`;
  }).join("");
  $("#cartCount").textContent = count;
  $("#cartTotal").textContent = money(total);
  $("#cartEmpty").hidden = count > 0;
}

function toggleDrawer(open) {
  $("#drawer").classList.toggle("open", open);
  $("#drawer").setAttribute("aria-hidden", !open);
  $("#overlay").hidden = !open;
}

function initCart() {
  $("#cartOpen").addEventListener("click", () => toggleDrawer(true));
  $("#cartClose").addEventListener("click", () => toggleDrawer(false));
  $("#overlay").addEventListener("click", () => toggleDrawer(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape") toggleDrawer(false); });

  $("#cartList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.act === "inc") changeQty(id, 1);
    if (btn.dataset.act === "dec") changeQty(id, -1);
    if (btn.dataset.act === "rm") { cart = cart.filter(i => i.id !== id); saveCart(); }
  });

  $("#clearCart").addEventListener("click", () => { cart = []; saveCart(); });
  $("#checkout").addEventListener("click", async () => {
    if (!cart.length) return toast("Your cart is empty");
    const customer = $("#customerName").value.trim();
    if (customer.length < 2) { $("#customerName").focus(); return toast("Please enter your name"); }
    if (!dbOnline) return toast("Database is offline (demo mode)");
    const btn = $("#checkout");
    btn.disabled = true;
    try {
      await post("orders", { customer, items: cart });
      cart = [];
      saveCart();
      toggleDrawer(false);
      toast("Order saved to the database. Thank you!");
      loadDbLists();
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  });
  renderCart();
}

/* ---------- Cloud tabs ---------- */
function showTab(key) {
  const m = CLOUD_MODELS[key];
  $("#tabPanel").innerHTML = `
    <h3>${m.title}</h3>
    <p>${m.text}</p>
    <ul>${m.points.map(p => `<li>${p}</li>`).join("")}</ul>`;
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === key));
}
function initTabs() {
  $$(".tab").forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));
  showTab("paas");
}

/* ---------- Contact form ---------- */
function initForm() {
  const form = $("#contactForm");
  const rules = {
    name: v => v.trim().length >= 2 || "Please enter your name (min 2 characters).",
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Please enter a valid email address.",
    message: v => v.trim().length >= 10 || "Message must be at least 10 characters."
  };

  function validate(field) {
    const input = form.elements[field];
    const result = rules[field](input.value);
    const msg = result === true ? "" : result;
    $(`.error[data-for="${field}"]`).textContent = msg;
    input.classList.toggle("invalid", Boolean(msg));
    return !msg;
  }

  Object.keys(rules).forEach(f => form.elements[f].addEventListener("blur", () => validate(f)));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const ok = Object.keys(rules).map(validate).every(Boolean);
    const status = $("#formStatus");
    status.style.color = "";
    if (!ok) { status.textContent = ""; return; }
    if (!dbOnline) { status.textContent = "Database is offline (demo mode)."; status.style.color = "var(--danger)"; return; }
    try {
      await post("messages", {
        name: form.elements.name.value,
        email: form.elements.email.value,
        message: form.elements.message.value
      });
      status.textContent = "Thanks, " + form.elements.name.value.trim() + "! Your message was saved.";
      form.reset();
      loadDbLists();
    } catch (err) {
      status.textContent = err.message;
      status.style.color = "var(--danger)";
    }
  });
}

/* ---------- Database lists ---------- */
async function loadDbLists() {
  const pill = $("#dbStatus");
  const ordersEl = $("#ordersList");
  const msgsEl = $("#messagesList");
  try {
    const [orders, msgs] = await Promise.all([api("orders"), api("messages")]);
    dbOnline = true;
    pill.textContent = "Connected: Netlify Blobs";
    pill.className = "pill online";
    ordersEl.innerHTML = orders.length ? orders.map(o => `
      <li><strong>${esc(o.customer)}</strong> &middot; ${money(o.total)}
        <span class="meta">${o.items.map(i => esc(i.name) + " x" + i.qty).join(", ")} &middot; ${when(o.createdAt)}</span></li>`).join("")
      : '<li class="none">No orders yet. Add something to the cart and check out.</li>';
    msgsEl.innerHTML = msgs.length ? msgs.map(m => `
      <li><strong>${esc(m.name)}</strong>: ${esc(m.message)}
        <span class="meta">${when(m.createdAt)}</span></li>`).join("")
      : '<li class="none">No messages yet. Use the contact form below.</li>';
  } catch (e) {
    dbOnline = false;
    pill.textContent = "Offline (demo data)";
    pill.className = "pill offline";
    ordersEl.innerHTML = msgsEl.innerHTML = '<li class="none">The database API is not reachable. Deploy on Netlify (or run <code>netlify dev</code>).</li>';
  }
}

/* ---------- Clock & year ---------- */
function initClock() {
  const tick = () => {
    $("#clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  tick();
  setInterval(tick, 30000);
  $("#year").textContent = new Date().getFullYear();
}

/* ---------- Start ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initNav();
  initCart();
  initTabs();
  initForm();
  initClock();
  await initProducts();   // loads the catalog from the database
  renderCart();           // re-render now that real prices are known
  loadDbLists();
});
