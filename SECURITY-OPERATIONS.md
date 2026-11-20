# QuickTools24 security and operations notes

## Browser-side file processing limits

The browser tools apply defensive limits to reduce memory exhaustion and malformed-file handling risks:

- PDF input: 25 MiB per file; merged input: 60 MiB total; maximum 300 pages.
- PDF-to-image, grayscale, and raster compression: maximum 60 pages per run.
- Image input: 15 MiB per image, 40 MiB total selected, and 30 images maximum.
- Decoded image source: 24 megapixels maximum; output canvas: 4096 px per side and 12 megapixels maximum.
- Images-to-PDF: 20 megapixels combined; background removal: 8 megapixels.
- Text input: 100,000 characters.

These are safety ceilings, not performance guarantees. Older phones may still fail below these limits; users should close other tabs and work with smaller files when possible. Processing stays in the browser for the core PDF/image tools, but browser libraries are loaded from third-party CDNs.

## Response security headers and hosting

The repository's latest deployment history shows a GitHub Pages deployment workflow. Cloudflare Pages' `_headers` file convention is therefore not assumed to apply to the public site. If the public hostname is proxied through Cloudflare, configure response-header rules in the Cloudflare dashboard for the public zone. Verify the actual response headers on `https://quicktools24.in/` after the rule is deployed. The Admin Worker is a separate Worker response and already sets its own security headers in code.

Recommended public-site headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, and HSTS after confirming HTTPS is enforced on the public hostname.

A site-wide Content Security Policy is intentionally not enabled yet. The current pages use inline scripts and third-party CDN dependencies (including a dynamic background-removal module). A strict CSP added without a dependency inventory would break tools. The safer long-term path is to self-host and pin dependencies, remove inline script handlers, then roll out CSP in report-only mode before enforcement.

## Manual Cloudflare/GitHub controls still required

These settings cannot be safely changed from repository files alone:

1. In GitHub, protect `main`: require the QuickTools24 quality-check status before merge, disallow force pushes, and require changes to go through pull requests.
2. In Cloudflare, add rate-limiting rules for Admin login/callback and write endpoints. Treat IP-based limits carefully because mobile carriers and shared networks can place many legitimate users behind one IP. Cloudflare's Worker rate-limit counters are approximate and location-scoped.
3. Confirm `GITHUB_CLIENT_SECRET` is stored as a Worker secret, not committed to the repository or configured as a public variable. Rotate it if it was ever exposed.
4. Confirm the Worker is deployed after any Worker source change. A GitHub PR merge alone does not prove that the separate Admin Worker has deployed.
5. Test the live site on a low-memory Android phone and a desktop browser before merging a production change.

## Current scope of automated checks

The GitHub Actions quality check verifies Worker and inline JavaScript syntax, duplicate HTML IDs, local links/assets, sitemap file paths, and the web manifest JSON. It does not replace browser-based functional testing, security penetration testing, or live Cloudflare response-header verification.
