import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AppCard from "../components/AppCard";
import CategoryTabs from "../components/CategoryTabs";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { categoryMap } from "../data/categories";
import { getPublishedApps } from "../services/appsService";

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

  const filteredApps = useMemo(() => {
    return apps.filter((app) => activeCategory === "all" || app.categoryKey === activeCategory);
  }, [apps, activeCategory]);

  const title = activeCategory === "all" ? "Todas las apps disponibles" : categoryMap[activeCategory];

  function handleSearchChange(event) {
    const nextParams = new URLSearchParams(searchParams);
    const value = event.target.value;

    if (value) nextParams.set("q", value);
    else nextParams.delete("q");

    setSearchParams(nextParams, { replace: true });
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

      <main className="container catalog-section home-catalog-section">
        <div className="catalog-heading">
          <div>
            <span className="eyebrow">Catálogo</span>
            <h1>{title}</h1>
          </div>
          <p>{filteredApps.length} app{filteredApps.length === 1 ? "" : "s"}</p>
        </div>

        {loading ? <LoadingState text="Cargando apps publicadas..." /> : null}
        {error ? <div className="error-box">{error}</div> : null}

        {!loading && !error && filteredApps.length > 0 ? (
          <div className="apps-grid">
            {filteredApps.map((app) => <AppCard app={app} key={app.id} />)}
          </div>
        ) : null}

        {!loading && !error && filteredApps.length === 0 ? (
          <EmptyState
            title={apps.length ? "No hay apps en esta categoría" : "Aún no hay apps publicadas"}
            message={apps.length ? "Prueba con otra categoría." : "Cuando publiques apps desde el panel admin aparecerán aquí automáticamente."}
          />
        ) : null}
      </main>

      {searchOpen ? (
        <section className="app-search-overlay" aria-label="Buscar apps">
          <div className="app-search-topbar">
            <button type="button" onClick={closeSearch} aria-label="Volver">
              <ArrowLeft size={24} />
            </button>

            <div className="app-search-input-wrap">
              <Search size={21} />
              <input
                autoFocus
                aria-label="Buscar apps"
                onChange={handleSearchChange}
                placeholder="Buscar apps"
                type="search"
                value={searchTerm}
              />
            </div>

            <button type="button" onClick={clearSearch} aria-label="Borrar búsqueda" disabled={!searchTerm}>
              <X size={24} />
            </button>
          </div>

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
