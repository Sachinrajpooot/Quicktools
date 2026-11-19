# QuickTools24 Admin and Analytics Setup

## SEO article publishing
- The private admin dashboard is served by the existing Cloudflare Worker at /admin.
- Sign in with the authorized GitHub account.
- The SEO Guides category is /articles/.
- Creating an article opens a GitHub pull request. Review and merge it to publish the page and sitemap changes.

## Tool usage analytics
1. In Cloudflare Dashboard, open Workers & Pages and select quicktools24-admin.
2. Open Settings > Bindings and add a KV Namespace binding.
3. Set the variable name to USAGE_KV and select a new namespace named QUICKTOOLS24_USAGE.
4. Save and deploy the Worker.
5. Open /admin again. Tool usage totals for the last seven days will appear in the dashboard.

The public tool page records one use per page visit after the visitor first selects a file or activates a tool button. No file contents or personal information are sent. Daily counts are stored in KV for up to 400 days.
