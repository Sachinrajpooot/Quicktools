# QuickTools24 — Cloudflare Pages migration notes

## Static site build
- Repository: `Sachinrajpooot/Quicktools`
- Production branch: `main`
- Framework preset: None
- Build command: leave empty (static HTML/CSS/JS; no build step)
- Build output directory: `.` (repository root)
- Root `wrangler.toml` declares the Pages output directory for Wrangler-based deployments.
- Keep the existing `worker/` project separate. It powers the private admin and article publishing workflow; it is not the Pages static-site build.
- Keep the existing Vercel analytics API deployment. The About page currently calls `https://quicktools-analytics-api.vercel.app/api/public-analytics`; do not remove that project or its `GOOGLE_SERVICE_ACCOUNT_JSON` configuration during the static-site migration.

## Required pre-cutover checks
1. Create a Cloudflare Pages preview deployment from this repository and verify the homepage, All Tools, PDF Editor, every tool route, assets, `ads.txt`, `robots.txt`, and `sitemap.xml`.
2. Verify the existing `quicktools24-admin` Worker is routed on the custom domain for `/admin*` and `/api/*`. Keep its GitHub OAuth secret and `USAGE_KV` binding. Do not replace it with a Pages static asset.
3. Verify the About-page analytics dashboard and the Admin tool-usage dashboard. Keep the Vercel analytics API and Cloudflare Worker independently deployed.
4. Attach `quicktools24.in` and `www.quicktools24.in` to Pages only after the preview passes. Configure DNS and SSL at Cloudflare, then test both hosts and redirects.
5. Keep Namecheap Stellar hosting and its SSL active until the domain is serving the tested Pages deployment and all checks pass. Do not cancel hosting before that point.

## Direct tool navigation
Homepage cards, All Tools cards, tool sidebars, related-tool links and SEO landing-page CTAs now route to `/index.html?tool=<tool-id>`. The homepage application handles that query on initial load and opens the selected tool workspace directly, avoiding the previous intermediate landing-page route. `/tool.html` remains available as a compatibility page.

## Important
This repository change does not alter Namecheap DNS, Cloudflare account settings, Worker routes, secrets, KV bindings, or the existing Vercel project. Those live account settings must be verified in Cloudflare before DNS cutover.
