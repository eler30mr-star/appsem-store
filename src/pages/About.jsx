import Seo from "../components/Seo";

export default function About() {
  return (
    <main className="container legal-page">
      <Seo
        title="Sobre Appsem Store"
        description="Conoce Appsem Store, la tienda oficial de aplicaciones desarrolladas por AppsMart Technology."
        path="/about"
      />
      <span className="eyebrow">Institucional</span>
      <h1>Sobre Appsem Store</h1>
      <p>
        Appsem Store es la tienda oficial de aplicaciones desarrolladas y publicadas por AppsMart Technology.
        Su objetivo es presentar cada app con información clara, capturas, requisitos técnicos, novedades,
        políticas y enlaces oficiales de descarga.
      </p>
      <section>
        <h2>Aplicaciones oficiales</h2>
        <p>
          Las fichas publicadas pertenecen a AppsMart Technology o se identifican expresamente con su desarrollador.
          Los enlaces de descarga se muestran desde fuentes oficiales, como Google Play o archivos distribuidos por el desarrollador.
        </p>
      </section>
      <section>
        <h2>Transparencia y seguridad</h2>
        <p>
          Cada ficha procura informar la versión, compatibilidad, tamaño, fecha de actualización, presencia de anuncios,
          compras dentro de la app y políticas aplicables. Los comentarios pueden moderarse para evitar fraude, spam o abuso.
        </p>
      </section>
      <section>
        <h2>Desarrollador</h2>
        <p>
          Appsem Store forma parte de AppsMart Technology, proyecto dedicado al desarrollo de soluciones digitales y aplicaciones móviles.
        </p>
        <a className="outline-button" href="https://appsmart-technology.vercel.app" target="_blank" rel="noopener noreferrer">
          Visitar AppsMart Technology
        </a>
      </section>
    </main>
  );
}
