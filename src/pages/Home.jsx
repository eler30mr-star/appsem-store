import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import AppCard from "../components/AppCard";
import CategoryTabs from "../components/CategoryTabs";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { categories, categoryMap } from "../data/categories";
import { getPublishedApps } from "../services/appsService";

const fallbackIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%231e293b'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='34' font-weight='700' fill='white'%3EAS%3C/text%3E%3C/svg%3E";

function normalizeCategory(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function appMatchesCategory(app, category) {
  const appKey = normalizeCategory(app.categoryKey);
  const appLabel = normalizeCategory(app.category);
  const categoryKey = normalizeCategory(category.key);
  const categoryLabel = normalizeCategory(category.label);

  const aliases = {
    bible: ["bible", "biblia", "biblias"],
    christian: ["christian", "cristiana", "cristianas", "cristiano", "cristianos"],
    tools: ["tools", "herramienta", "herramientas"],
    education: ["education", "educacion"],
    entertainment: ["entertainment", "entretenimiento"],
    productivity: ["productivity", "productividad"],
    lifestyle: ["lifestyle", "estilo de vida"],
    games: ["games", "juego", "juegos"],
    other: ["other", "otros", "otro"]
  };

  const accepted = new Set([categoryKey, categoryLabel, ...(aliases[category.key] || [])]);
  return accepted.has(appKey) || accepted.has(appLabel);
}

function AppRowCard({ app }) {
  const bannerStyle = app.bannerUrl
    ? { backgroundImage: `url(${app.bannerUrl})` }
    : undefined;

  return (
    <Link className="home-row-app-card" to={`/app/${app.slug}`} aria-label={`Ver ${app.title}`}>
      <div className="home-row-app-banner" style={bannerStyle} aria-hidden="true" />
      <div className="home-row-app-body">
        <img src={app.iconUrl || fallbackIcon} alt={`Icono de ${app.title}`} />
        <div className="home-row-app-copy">
          <strong>{app.title}</strong>
          <span>{categoryMap[app.categoryKey] || app.category || "App"}</span>
          <small>★ {Number(app.ratingAverage || 0).toFixed(1)}</small>
        </div>
      </div>
    </Link>
  );
}

function AppHorizontalSection({ title, apps }) {
  if (!apps.length) return null;

  return (
    <section className="home-app-row-section">
      <div className="home-section-heading">
        <h2>{title}</h2>
      </div>
      <div className="home-app-row" aria-label={title}>
        {apps.map((app) => <AppRowCard app={app} key={app.id} />)}
      </div>
    </section>
  );
}

export default function Home() {
  const [apps, setApps] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("q") || "";
  const searchOpen = searchParams.get("search") === "1";

  useEffect(() => {
    let alive = true;

    async function loadApps() {
      setLoading(true);
      setError("");
      try {
        const data = await getPublishedApps();
        if (alive) setApps(data);
      } catch (err) {
        console.error(err);
        if (alive) setError("No se pudieron cargar las apps. Revisa Firebase y las reglas de Firestore.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadApps();
    return () => {
      alive = false;
    };
  }, []);

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    return apps.filter((app) => [app.title, app.shortDescription, app.fullDescription, app.category]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)));
  }, [apps, searchTerm]);

  const categorySections = useMemo(() => {
    const visibleCategories = categories.filter((category) => category.key !== "all");
    const filteredCategories = activeCategory === "all"
      ? visibleCategories
      : visibleCategories.filter((category) => category.key === activeCategory);

    return filteredCategories
      .map((category) => ({
        ...category,
        apps: apps.filter((app) => appMatchesCategory(app, category))
      }))
      .filter((category) => category.apps.length > 0);
  }, [apps, activeCategory]);

  function handleSearchChange(event) {
    const nextParams = new URLSearchParams(searchParams);
    const value = event.target.value;

    if (value) nextParams.set("q", value);
    else nextParams.delete("q");

    setSearchParams(nextParams, { replace: true });
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    event.currentTarget.querySelector("input")?.blur();
  }

  function clearSearch() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("q");
    setSearchParams(nextParams, { replace: true });
  }

  function closeSearch() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("search");
    nextParams.delete("q");
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <>
      <CategoryTabs activeCategory={activeCategory} onChange={setActiveCategory} />

      <main className="container home-store-content">
        {loading ? <LoadingState text="Cargando apps publicadas..." /> : null}
        {error ? <div className="error-box">{error}</div> : null}

        {!loading && !error && apps.length > 0 ? (
          <>
            {activeCategory === "all" ? (
              <section className="home-promoted-row-section">
                <div className="home-app-row home-app-row-primary" aria-label="Apps disponibles">
                  {apps.map((app) => <AppRowCard app={app} key={app.id} />)}
                </div>
              </section>
            ) : null}

            <div className="home-category-sections">
              {categorySections.map((category) => (
                <AppHorizontalSection title={category.label} apps={category.apps} key={category.key} />
              ))}
            </div>
          </>
        ) : null}

        {!loading && !error && apps.length === 0 ? (
          <EmptyState
            title="Aún no hay apps publicadas"
            message="Cuando publiques apps desde el panel admin aparecerán aquí automáticamente."
          />
        ) : null}
      </main>

      {searchOpen ? (
        <section className="app-search-overlay" aria-label="Buscar apps">
          <form className="app-search-topbar" onSubmit={handleSearchSubmit} role="search">
            <button type="button" onClick={closeSearch} aria-label="Volver">
              <ArrowLeft size={24} />
            </button>

            <div className="app-search-input-wrap">
              <Search size={21} />
              <input
                autoFocus
                aria-label="Buscar apps"
                enterKeyHint="search"
                inputMode="search"
                onChange={handleSearchChange}
                placeholder="Buscar apps"
                type="search"
                value={searchTerm}
              />
            </div>

            <button type="button" onClick={clearSearch} aria-label="Borrar búsqueda" disabled={!searchTerm}>
              <X size={24} />
            </button>
          </form>

          <div className="container app-search-results">
            {loading ? <LoadingState text="Cargando apps publicadas..." /> : null}
            {error ? <div className="error-box">{error}</div> : null}

            {!loading && !error && !searchTerm ? (
              <p className="app-search-hint">Escribe el nombre o una palabra relacionada con la app.</p>
            ) : null}

            {!loading && !error && searchTerm && searchResults.length > 0 ? (
              <>
                <div className="app-search-results-heading">
                  <strong>Resultados</strong>
                  <span>{searchResults.length}</span>
                </div>
                <div className="apps-grid">
                  {searchResults.map((app) => <AppCard app={app} key={app.id} />)}
                </div>
              </>
            ) : null}

            {!loading && !error && searchTerm && searchResults.length === 0 ? (
              <EmptyState title="No encontramos apps" message="Prueba con otro nombre o término de búsqueda." />
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
