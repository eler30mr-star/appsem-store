import { Link, NavLink, useLocation } from "react-router-dom";
import { Grid2X2, Share2, ShieldCheck } from "lucide-react";

export default function Header() {
  const { pathname } = useLocation();
  const isAppDetails = pathname.startsWith("/app/");

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
