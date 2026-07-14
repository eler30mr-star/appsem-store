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
        Opera desde Perú y presenta cada aplicación con información técnica, capturas, políticas y enlaces oficiales.
      </p>

      <section>
        <h2>Qué publicamos</h2>
        <p>
          Publicamos aplicaciones propias o fichas cuya autoría y desarrollador estén claramente identificados.
          Cada ficha debe indicar versión, compatibilidad, tamaño, fecha de actualización, presencia de anuncios,
          compras dentro de la app y enlaces legales aplicables.
        </p>
      </section>

      <section>
        <h2>Descargas verificadas</h2>
        <p>
          Los botones de descarga dirigen a Google Play o a un archivo proporcionado por el desarrollador.
          Cuando existe una descarga directa, la ficha puede incluir versión, tamaño y huella SHA-256 para facilitar su verificación.
        </p>
      </section>

      <section>
        <h2>Moderación y seguridad</h2>
        <p>
          Los comentarios se revisan antes de publicarse. Se eliminan mensajes con spam, suplantación, contenido ofensivo,
          datos personales, enlaces maliciosos o información que pueda poner en riesgo a otros usuarios.
        </p>
      </section>

      <section>
        <h2>Reportes y retirada de contenido</h2>
        <p>
          Cualquier usuario puede reportar una ficha incorrecta, un enlace roto, una vulnerabilidad o una posible infracción
          mediante la página de contacto. Las aplicaciones retiradas dejan de mostrarse públicamente.
        </p>
      </section>

      <section>
        <h2>Responsable</h2>
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
