import { useState } from "react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { Grid2X2, Search, Share2, ShieldCheck, X } from "lucide-react";

export default function Header() {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(Boolean(searchParams.get("q")));
  const isAppDetails = pathname.startsWith("/app/");
  const isHome = pathname === "/";
  const searchValue = searchParams.get("q") || "";

  async function handleShare() {
    const shareData = {
      title: document.title,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("No se pudo compartir la página.", error);
      }
    }
  }

  function handleSearchChange(event) {
    const value = event.target.value;
    const nextParams = new URLSearchParams(searchParams);

    if (value) nextParams.set("q", value);
    else nextParams.delete("q");

    setSearchParams(nextParams, { replace: true });
  }

  function closeSearch() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("q");
    setSearchParams(nextParams, { replace: true });
    setSearchOpen(false);
  }

  return (
    <header className={`site-header ${isAppDetails ? "app-detail-site-header" : ""}`}>
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="Ir al inicio de Appsem Store">
          <span className="brand-mark">AS</span>
          <span>
            <strong>Appsem Store</strong>
            <small>Tienda de apps Android</small>
          </span>
        </Link>

        {isAppDetails ? (
          <button
            className="app-detail-share-button"
            type="button"
            onClick={handleShare}
            aria-label="Compartir esta app"
            title="Compartir"
          >
            <Share2 size={22} />
          </button>
        ) : isHome ? (
          <div className={`header-search ${searchOpen ? "open" : ""}`}>
            {searchOpen ? (
              <div className="header-search-field">
                <Search size={20} />
                <input
                  aria-label="Buscar apps"
                  autoFocus
                  onChange={handleSearchChange}
                  placeholder="Buscar apps..."
                  type="search"
                  value={searchValue}
                />
                <button type="button" onClick={closeSearch} aria-label="Cerrar búsqueda">
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                className="header-search-button"
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Buscar apps"
                title="Buscar"
              >
                <Search size={23} />
              </button>
            )}
          </div>
        ) : (
          <nav className="top-nav" aria-label="Navegación principal">
            <NavLink to="/" end>
              <Grid2X2 size={17} /> Apps
            </NavLink>
            <NavLink to="/privacy">
              <ShieldCheck size={17} /> Privacidad
            </NavLink>
          </nav>
        )}
      </div>
    </header>
  );
}
