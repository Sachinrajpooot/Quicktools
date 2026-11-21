const crypto = require("node:crypto");

const ALLOWED_ORIGINS = new Set(["https://quicktools24.in", "https://www.quicktools24.in"]);
const CACHE = new Map();
const b64url = (value) => Buffer.from(value).toString("base64url");

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  res.end(JSON.stringify(body));
}

function googleConfig() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error("Google service account is not configured");
  const account = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!account.client_email || !account.private_key) throw new Error("Google service account credentials are incomplete");
  return account;
}

async function accessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = header + "." + claim;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + "." + signer.sign(account.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Google authorization failed: " + (data.error_description || data.error || response.status));
  return data.access_token;
}

async function googlePost(url, token, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Google API " + response.status + ": " + (data.error && data.error.message || "request failed"));
  return data;
}

function rows(report, keyName, metricName, transform) {
  return (report.rows || []).map((row) => {
    const key = row.dimensionValues && row.dimensionValues[0] ? row.dimensionValues[0].value : "";
    const value = row.metricValues && row.metricValues[0] ? Number(row.metricValues[0].value || 0) : 0;
    return transform ? transform(key, value) : { [keyName]: key, [metricName]: value };
  });
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "GET") return json(res, 405, { status: "error", message: "Method not allowed" });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(res, 403, { status: "error", message: "Origin not allowed" });

  const range = ["7d", "28d", "90d"].includes(req.query && req.query.range) ? req.query.range : "28d";
  const cacheKey = range;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.until > Date.now()) return json(res, 200, cached.value);

  try {
    const account = googleConfig();
    const token = await accessToken(account);
    const property = (process.env.GA4_PROPERTY_ID || "565291690").replace(/^properties\//, "");
    const siteUrl = process.env.GSC_SITE_URL || "https://quicktools24.in/";
    const days = Number(range.slice(0, -1));
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const endDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const dateRanges = [{ startDate: days + "daysAgo", endDate: "yesterday" }];

    const [summary, pages, devices, sources, events, realtime, search] = await Promise.all([
      googlePost("https://analyticsdata.googleapis.com/v1beta/properties/" + property + ":runReport", token, {
        dateRanges, metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }]
      }),
      googlePost("https://analyticsdata.googleapis.com/v1beta/properties/" + property + ":runReport", token, {
        dateRanges, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 5
      }),
      googlePost("https://analyticsdata.googleapis.com/v1beta/properties/" + property + ":runReport", token, {
        dateRanges, dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 5
      }),
      googlePost("https://analyticsdata.googleapis.com/v1beta/properties/" + property + ":runReport", token, {
        dateRanges, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 5
      }),
      googlePost("https://analyticsdata.googleapis.com/v1beta/properties/" + property + ":runReport", token, {
        dateRanges, dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "BEGINS_WITH", value: "tool_use_" } } }, orderBys: [{ metric: { metricName: "eventCount" }, desc: true }], limit: 5
      }),
      googlePost("https://analyticsdata.googleapis.com/v1beta/properties/" + property + ":runRealtimeReport", token, {
        metrics: [{ name: "activeUsers" }]
      }),
      googlePost("https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query", token, {
        startDate, endDate, dimensions: ["page"], rowLimit: 5
      })
    ]);

    const sm = summary.rows && summary.rows[0] ? summary.rows[0].metricValues : [];
    const value = (i) => sm[i] ? Number(sm[i].value || 0) : 0;
    const searchRows = search.rows || [];
    const impressions = searchRows.reduce((n, r) => n + Number(r.impressions || 0), 0);
    const clicks = searchRows.reduce((n, r) => n + Number(r.clicks || 0), 0);
    const weightedPosition = searchRows.reduce((n, r) => n + Number(r.position || 0) * Number(r.impressions || 0), 0);
    const eventRows = rows(events, "name", "uses", (name, uses) => ({ name: name.replace(/^tool_use_/, ""), uses }));
    const result = {
      status: "ok",
      periodLabel: range,
      updatedAt: new Date().toISOString(),
      searchConsole: {
        impressions, clicks, ctr: impressions ? clicks / impressions : 0,
        averagePosition: impressions ? weightedPosition / impressions : null
      },
      analytics: { activeUsers: value(0), sessions: value(1), pageViews: value(2) },
      realtimeActiveUsers: realtime.rows && realtime.rows[0] && realtime.rows[0].metricValues[0] ? Number(realtime.rows[0].metricValues[0].value || 0) : 0,
      topPages: rows(pages, "path", "views"),
      topTools: eventRows,
      devices: rows(devices, "name", "users"),
      sources: rows(sources, "name", "sessions")
    };
    CACHE.set(cacheKey, { until: Date.now() + 60000, value: result });
    return json(res, 200, result);
  } catch (error) {
    return json(res, 503, { status: "unavailable", message: error.message || "Analytics is not configured yet" });
  }
};
