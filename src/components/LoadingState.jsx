export default function LoadingState({ text = "Cargando contenido..." }) {
  if (text === "Cargando ficha de la app...") {
    return (
      <div className="app-detail-loading" aria-label={text} aria-busy="true">
        <div className="app-detail-loading-hero">
          <div className="app-detail-loading-banner skeleton-shimmer" />

          <div className="app-detail-loading-summary">
            <div className="app-detail-loading-icon skeleton-shimmer" />
            <div className="app-detail-loading-copy">
              <span className="app-detail-loading-category skeleton-shimmer" />
              <span className="app-detail-loading-title skeleton-shimmer" />
              <span className="app-detail-loading-rating skeleton-shimmer" />
            </div>
          </div>

          <div className="app-detail-loading-stats">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="app-detail-loading-stat" key={index}>
                <span className="app-detail-loading-stat-value skeleton-shimmer" />
                <span className="app-detail-loading-stat-label skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>

        <div className="app-detail-loading-body">
          <div className="app-detail-loading-actions">
            <span className="skeleton-shimmer" />
            <span className="skeleton-shimmer" />
            <span className="app-detail-loading-like skeleton-shimmer" />
          </div>

          <div className="app-detail-loading-gallery">
            <span className="skeleton-shimmer" />
            <span className="skeleton-shimmer" />
            <span className="skeleton-shimmer" />
          </div>

          <div className="app-detail-loading-about skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (text === "Cargando apps publicadas...") {
    return (
      <div className="catalog-loading" aria-label={text} aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <article className="catalog-loading-card" key={index}>
            <div className="catalog-loading-main">
              <div className="catalog-loading-icon skeleton-shimmer" />
              <div className="catalog-loading-copy">
                <span className="catalog-loading-category skeleton-shimmer" />
                <span className="catalog-loading-title skeleton-shimmer" />
                <span className="catalog-loading-text skeleton-shimmer" />
                <span className="catalog-loading-text short skeleton-shimmer" />
              </div>
            </div>
            <div className="catalog-loading-meta">
              <span className="skeleton-shimmer" />
              <span className="skeleton-shimmer" />
              <span className="skeleton-shimmer" />
            </div>
            <div className="catalog-loading-footer">
              <span className="catalog-loading-stars skeleton-shimmer" />
              <span className="catalog-loading-button skeleton-shimmer" />
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="site-loading-state" aria-label={text} aria-busy="true">
      <div className="site-loading-spinner" />
      <p>{text}</p>
    </div>
  );
}
