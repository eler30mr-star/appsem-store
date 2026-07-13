export default function ScreenshotGallery({ screenshots = [], title = "App" }) {
  if (!screenshots.length) {
    return (
      <div className="screenshots-empty">
        <p>Aún no hay capturas de pantalla disponibles.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        className="screenshots-row"
        aria-label={`Capturas de pantalla de ${title}`}
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorInline: "contain",
        }}
      >
        {screenshots.map((url, index) => (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="screenshot-frame"
            key={`${url}-${index}`}
          >
            <img
              src={url}
              alt={`Captura ${index + 1} de ${title}`}
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
