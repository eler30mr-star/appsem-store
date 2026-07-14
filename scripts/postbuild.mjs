import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const SITE_URL = "https://appsem-store.vercel.app";
const PROJECT_ID = "webs-8b1bf";
const DIST = "dist";
const STATIC_ROUTES = ["/", "/about", "/contact", "/privacy", "/cookies", "/terms"];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fieldValue(field) {
  if (!field) return undefined;
  if ("stringValue" in field) return field.stringValue;
  if ("booleanValue" in field) return field.booleanValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("timestampValue" in field) return field.timestampValue;
  if ("arrayValue" in field) return (field.arrayValue.values || []).map(fieldValue);
  return undefined;
}

function parseDocument(document) {
  const app = {};
  for (const [key, value] of Object.entries(document.fields || {})) app[key] = fieldValue(value);
  app.id = document.name?.split("/").pop();
  return app;
}

async function fetchPublishedApps() {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/apps?pageSize=1000`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Firestore respondió ${response.status}`);
  const payload = await response.json();
  return (payload.documents || []).map(parseDocument).filter((app) => app.status === "published" && app.slug);
}

function setMeta(html, app) {
  const title = `${app.title} | Appsem Store`;
  const description = app.seoDescription || app.shortDescription || app.fullDescription || `Descubre ${app.title} en Appsem Store.`;
  const url = `${SITE_URL}/app/${app.slug}`;
  const image = app.bannerUrl || app.iconUrl || `${SITE_URL}/appsem-store-icon.png`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.title,
    description,
    url,
    image,
    operatingSystem: app.operatingSystem || "Android",
    applicationCategory: app.category || "Application",
    softwareVersion: app.currentVersion || undefined,
    fileSize: app.appSize || undefined,
    author: { "@type": "Organization", name: app.developer || "AppsMart Technology" },
    offers: {
      "@type": "Offer",
      price: String(app.price || "Gratis").toLowerCase().includes("gratis") ? "0" : undefined,
      priceCurrency: "USD"
    }
  };

  return html
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${escapeHtml(url)}" />`)
    .replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${escapeHtml(image)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeHtml(url)}" />`)
    .replace("</head>", `    <script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>\n  </head>`);
}

function sitemap(apps) {
  const now = new Date().toISOString().slice(0, 10);
  const urls = [
    ...STATIC_ROUTES.map((path) => ({ loc: `${SITE_URL}${path}`, priority: path === "/" ? "1.0" : "0.6" })),
    ...apps.map((app) => ({ loc: `${SITE_URL}/app/${app.slug}`, priority: "0.8" }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ loc, priority }) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join("\n")}\n</urlset>\n`;
}

async function writeRoute(path, html) {
  const target = path === "/" ? join(DIST, "index.html") : join(DIST, path, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}

async function main() {
  const template = await readFile(join(DIST, "index.html"), "utf8");
  let apps = [];
  try {
    apps = await fetchPublishedApps();
  } catch (error) {
    console.warn("No se pudieron cargar apps para el prerender:", error.message);
  }

  for (const route of STATIC_ROUTES.filter((route) => route !== "/")) await writeRoute(route, template);
  for (const app of apps) await writeRoute(`/app/${app.slug}`, setMeta(template, app));
  await writeFile(join(DIST, "sitemap.xml"), sitemap(apps), "utf8");
  console.log(`Prerender completado: ${apps.length} fichas y sitemap generado.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
