# Deploying Gallery Wall Planner

Pure static single-page app. No backend, no env vars, no server-side anything.
All user data stays in the browser (`localStorage`). This means hosting is free and trivial.

## Build
```bash
npm install
npm run build      # outputs static site to ./dist
npm run preview    # serve ./dist locally to sanity-check the production build
```

Build settings for any host:
- Build command: `npm run build`
- Output / publish directory: `dist`
- Node: 18+ (dev machine uses 26)

## Host options (all free tier, static)
Any of these work. Pick one:

### Cloudflare Pages (recommended — generous free tier, fast CDN)
1. Push repo to GitHub.
2. Cloudflare dashboard -> Pages -> Connect to Git -> pick repo.
3. Build command `npm run build`, output dir `dist`. Deploy.
4. Add a custom domain under the project's Custom Domains tab.

### Netlify
1. Push to GitHub -> Netlify -> Add new site -> Import.
2. Build `npm run build`, publish `dist`.
3. `netlify.toml` in this repo already sets these.

### Vercel
1. Import repo. Framework preset: Vite. It auto-detects build `npm run build`, output `dist`.

## SPA routing note
The app has NO client-side router — it's one page — so no redirect/rewrite rules are needed.
If a router is added later, add a catch-all rewrite to `/index.html`.

## Custom domain
- Buy a domain (Namecheap / Cloudflare Registrar / Porkbun).
- Point it at the host per their Custom Domain instructions (usually a CNAME).
- HTTPS is automatic on all three hosts above.

## Before adding ANY monetization (ads / affiliate), you will also need:
- A privacy policy page (required by AdSense; good practice for affiliate).
- A cookie-consent banner IF you add ads or analytics that set cookies (GDPR/ePrivacy).
  Plain affiliate links do NOT require a consent banner, but DO require an affiliate
  disclosure line (FTC / Amazon Associates rule).
- See MONETIZATION.md for the realistic revenue picture and requirements.
