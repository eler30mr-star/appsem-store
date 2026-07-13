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

  return (
    <div className="loading-state">
      <span className="loader" />
      <p>{text}</p>
    </div>
  );
}
