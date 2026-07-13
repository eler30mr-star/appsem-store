import { useEffect, useMemo, useState } from "react";
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
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("q") || "";

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

  const filteredApps = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return apps.filter((app) => {
      const byCategory = activeCategory === "all" || app.categoryKey === activeCategory;
      const byText = !term || [app.title, app.shortDescription, app.fullDescription, app.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return byCategory && byText;
    });
  }, [apps, activeCategory, searchTerm]);

  const title = activeCategory === "all" ? "Todas las apps disponibles" : categoryMap[activeCategory];

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
            message={apps.length ? "Prueba con otra categoría o limpia la búsqueda." : "Cuando publiques apps desde el panel admin aparecerán aquí automáticamente."}
          />
        ) : null}
      </main>
    </>
  );
}
