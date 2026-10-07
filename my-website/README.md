# UIT Gear Store

Demo web app for **CNS 303 – Cloud Computing Fundamentals, Lab 03** (PaaS deployment on Netlify).

**Stack:** HTML + CSS + JavaScript front end, Netlify Functions (serverless API), Netlify Blobs (database).

## Features
- Responsive layout, light/dark theme
- Products loaded from the database (`/api/products`, seeded on first request)
- Shopping cart; checkout saves an order to the database (`/api/orders`)
- Contact form saves messages to the database (`/api/messages`)
- "Live database" section shows recent orders and messages
- Prices are re-calculated on the server; user text is sanitised and escaped

## Project structure
```
index.html          page
css/style.css       styles
js/script.js        front-end logic
netlify/functions/  serverless API (products, orders, messages)
netlify/lib/db.mjs  shared database helpers (Netlify Blobs)
netlify.toml        Netlify settings
package.json        dependency: @netlify/blobs
```

## Deploy on Netlify (from GitHub)
- Build command: *(empty)*
- Publish directory: `.`
- Functions directory: `netlify/functions` (already set in `netlify.toml`)

Netlify installs `@netlify/blobs` automatically and connects the database. No environment variables are needed.

## Run locally
`npm install -g netlify-cli`, then `npm install` and `netlify dev`.
(Opening `index.html` directly still works, but in offline demo mode without the database.)
