/** Enlace de descarga presentado solo desde el catálogo, sin ejecutar esquemas activos. */
export function validatedDownloadUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.port || url.hostname === "localhost" ||
        url.hostname.endsWith(".local") || url.hostname.endsWith(".localhost") ||
        /^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) ||
        url.hostname.includes(":")) return null;
    return url.href;
  } catch {
    return null;
  }
}
