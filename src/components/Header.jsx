import { Link, NavLink, useLocation } from "react-router-dom";
import { Grid2X2, ShieldCheck } from "lucide-react";

export default function Header() {
  const { pathname } = useLocation();
  const isAppDetails = pathname.startsWith("/app/");

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

        {!isAppDetails ? (
          <nav className="top-nav" aria-label="Navegación principal">
            <NavLink to="/" end>
              <Grid2X2 size={17} /> Apps
            </NavLink>
            <NavLink to="/privacy">
              <ShieldCheck size={17} /> Privacidad
            </NavLink>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
