import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Heart,
  Info,
  Shield,
  Star
} from "lucide-react";
import CommentSection from "../components/CommentSection";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import RatingStars from "../components/RatingStars";
import ScreenshotGallery from "../components/ScreenshotGallery";
import { categoryMap } from "../data/categories";
import {
  checkUserInteraction,
  getAppBySlug,
  getApprovedComments,
  likeApp,
  registerDownloadClick,
  submitRating
} from "../services/appsService";

const fallbackIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%231e293b'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='34' font-weight='700' fill='white'%3EAS%3C/text%3E%3C/svg%3E";

function formatNumber(value) {
  return new Intl.NumberFormat("es-PE", {
    notation: Number(value || 0) >= 10000 ? "compact" : "standard"
  }).format(value || 0);
}

export default function AppDetails() {
  const { slug } = useParams();
  const [app, setApp] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [rated, setRated] = useState(null);
  const [interactionMessage, setInteractionMessage] = useState("");
  const [aboutExpanded, setAboutExpanded] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadApp() {
      setLoading(true);
      setError("");

      try {
        const data = await getAppBySlug(slug);
        if (!alive) return;

        setApp(data);

        if (data) {
          const [publicComments, interaction] = await Promise.all([
            getApprovedComments(data.id),
            checkUserInteraction(data.id)
          ]);

          if (!alive) return;
          setComments(publicComments);
          setLiked(interaction.liked);
          setRated(interaction.rated);
        }
      } catch (err) {
        console.error(err);
        if (alive) setError("No se pudo cargar la información de esta app.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadApp();

    return () => {
      alive = false;
    };
  }, [slug]);

  async function handleLike() {
    if (!app || liked) return;
    setInteractionMessage("");

    try {
      const result = await likeApp(app.id);

      if (result.alreadyLiked) {
        setLiked(true);
        setInteractionMessage("Ya diste me gusta a esta app.");
        return;
      }

      setLiked(true);
      setApp((current) => ({
        ...current,
        likesCount: Number(current.likesCount || 0) + 1
      }));
      setInteractionMessage("Gracias por tu me gusta.");
    } catch (err) {
      console.error(err);
      setInteractionMessage("No se pudo registrar el me gusta.");
    }
  }

  async function handleRate(value) {
    if (!app || rated) return;
    setInteractionMessage("");

    try {
      const result = await submitRating(app.id, value);

      if (result.alreadyRated) {
        setRated(value);
        setInteractionMessage("Ya valoraste esta app anteriormente.");
        return;
      }

      setRated(value);
      setApp((current) => ({
        ...current,
        ratingAverage: result.ratingAverage,
        ratingCount: result.ratingCount
      }));
      setInteractionMessage("Gracias por valorar esta app.");
    } catch (err) {
      console.error(err);
      setInteractionMessage("No se pudo guardar la valoración.");
    }
  }

  async function openDownload(url) {
    if (!url || !app) return;

    try {
      await registerDownloadClick(app);
      setApp((current) => ({
        ...current,
        downloadsCount: Number(current.downloadsCount || 0) + 1
      }));
    } catch (err) {
      console.error(err);
    } finally {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function reloadComments() {
    if (!app) return;
    const publicComments = await getApprovedComments(app.id);
    setComments(publicComments);
  }

  if (loading) {
    return (
      <main className="container page-pad">
        <LoadingState text="Cargando ficha de la app..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="container page-pad">
        <div className="error-box">{error}</div>
      </main>
    );
  }

  if (!app) {
    return (
      <main className="container page-pad">
        <EmptyState title="App no encontrada" message="La app no existe o todavía no está publicada." />
        <Link className="back-link" to="/">
          <ArrowLeft size={18} /> Volver a la tienda
        </Link>
      </main>
    );
  }

  const bannerStyle = app.bannerUrl
    ? {
        backgroundImage: `linear-gradient(100deg, rgba(4, 10, 25, .72), rgba(4, 10, 25, .24)), url(${app.bannerUrl})`
      }
    : undefined;

  const directDownloadUrl = app.downloadUrl || app.apkUrl || app.playStoreUrl;

  return (
    <main>
      <section className="app-detail-hero app-detail-hero-v4">
        <div className="container app-detail-hero-inner">
          <Link className="back-link light app-detail-back" to="/" aria-label="Volver a la tienda">
            <ArrowLeft size={18} />
          </Link>

          <div className="app-detail-banner" style={bannerStyle} aria-label={`Banner de ${app.title}`} />

          <div className="app-summary-wrap">
            <div className="app-summary-card">
              <div className="app-summary-head">
                <img className="app-summary-icon" src={app.iconUrl || fallbackIcon} alt={`Icono de ${app.title}`} />

                <div className="app-summary-copy">
                  <span className="app-category light-category">
                    {categoryMap[app.categoryKey] || app.category || "App"}
                  </span>
                  <h1>{app.title}</h1>
                  <div className="detail-rating-line app-summary-rating">
                    <RatingStars value={Math.round(app.ratingAverage || 0)} />
                    <strong>{Number(app.ratingAverage || 0).toFixed(1)}</strong>
                    <span>· {formatNumber(app.ratingCount)} valoraciones</span>
                  </div>
                </div>
              </div>

              <div className="app-summary-stats" aria-label="Estadísticas de la app">
                <button
                  className={`app-summary-stat app-summary-like-stat ${liked ? "active" : ""}`}
                  onClick={handleLike}
                  disabled={liked}
                  type="button"
                >
                  <strong><Heart size={16} /> {formatNumber(app.likesCount)}</strong>
                  <span>{liked ? "Te gusta" : "Me gusta"}</span>
                </button>

                <div className="app-summary-stat">
                  <strong>{app.appSize || "—"}</strong>
                  <span>Tamaño</span>
                </div>

                <div className="app-summary-stat">
                  <strong>{formatNumber(app.downloadsCount)}</strong>
                  <span>Descargas</span>
                </div>

                <div className="app-summary-stat">
                  <strong>{Number(app.ratingAverage || 0).toFixed(1)}</strong>
                  <span>Valoración</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container detail-layout">
        <div className="detail-main">
          <div className="app-download-actions" aria-label="Opciones de descarga">
            <button
              className="app-direct-download"
              onClick={() => openDownload(directDownloadUrl)}
              disabled={!directDownloadUrl}
              type="button"
            >
              <Download size={19} /> Descargar
            </button>

            <button
              className="app-play-store-button"
              onClick={() => openDownload(app.playStoreUrl)}
              disabled={!app.playStoreUrl}
              type="button"
            >
              <span className="play-store-mark" aria-hidden="true">▶</span>
              Google Play
            </button>
          </div>

          <section className="app-screenshots-section" aria-label={`Capturas de pantalla de ${app.title}`}>
            <ScreenshotGallery screenshots={app.screenshots} title={app.title} />
          </section>

          <section className={`app-about-section ${aboutExpanded ? "expanded" : ""}`}>
            <button
              className="app-about-toggle"
              type="button"
              onClick={() => setAboutExpanded((current) => !current)}
              aria-expanded={aboutExpanded}
              aria-controls="app-about-content"
            >
              <span>Acerca de la app</span>
              {aboutExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>

            {aboutExpanded ? (
              <div id="app-about-content" className="app-about-content">
                <p className="long-text">
                  {app.fullDescription || app.shortDescription || "Descripción no disponible."}
                </p>
              </div>
            ) : null}
          </section>

          <section className="info-card">
            <h2><Info size={20} /> Información</h2>
            <dl>
              <div><dt>Tamaño</dt><dd>{app.appSize || "No especificado"}</dd></div>
              <div><dt>Sistema operativo</dt><dd>{app.operatingSystem || "Android"}</dd></div>
              <div><dt>Android requerido</dt><dd>{app.minAndroidVersion || "No especificado"}</dd></div>
              <div><dt>Versión actual</dt><dd>{app.currentVersion || "No especificado"}</dd></div>
              <div><dt>Desarrollador</dt><dd>{app.developer || "AppsMart Technology"}</dd></div>
            </dl>
          </section>

          <section className="info-card">
            <h2><Shield size={20} /> Seguridad y privacidad</h2>
            <p>Consulta la política de privacidad específica de esta app antes de descargarla.</p>
            {app.privacyPolicyUrl ? (
              <a className="outline-button" href={app.privacyPolicyUrl} target="_blank" rel="noreferrer">
                <BadgeCheck size={18} /> Ver política de la app
              </a>
            ) : (
              <p className="muted-text">No se agregó política individual para esta app.</p>
            )}
          </section>

          <section className="detail-section user-actions-card">
            <span className="eyebrow">Participación</span>
            <h2>Valora esta app</h2>
            <p className="muted-text">Tu valoración ayuda a otros visitantes a conocer mejor esta aplicación.</p>
            <div className="actions-row app-rating-actions">
              <div className="rate-box">
                <span>{rated ? "Ya valoraste" : "Tu valoración"}</span>
                <RatingStars value={rated || 0} interactive={!rated} onRate={handleRate} size={22} />
              </div>
            </div>
            {interactionMessage ? <p className="form-message">{interactionMessage}</p> : null}
          </section>

          <CommentSection appId={app.id} comments={comments} onCommentSent={reloadComments} />
        </div>
      </section>
    </main>
  );
}
