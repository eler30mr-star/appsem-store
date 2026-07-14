import { Link } from "react-router-dom";

const SUPPORT_EMAIL = "support@rap-infinite.online";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>Appsem Store</h3>
          <p>
            Tienda oficial de{" "}
            <a
              href="https://appsmart-technology.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#60a5fa", fontWeight: 800 }}
            >
              AppsMart Technology
            </a>
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
        <div className="footer-links">
          <Link to="/about">Sobre Appsem Store</Link>
          <Link to="/contact">Contacto y soporte</Link>
          <Link to="/privacy">Política de privacidad</Link>
          <Link to="/cookies">Política de cookies</Link>
          <Link to="/terms">Términos y condiciones</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} Appsem Store · AppsMart Technology · Perú.
      </div>
    </footer>
  );
}
