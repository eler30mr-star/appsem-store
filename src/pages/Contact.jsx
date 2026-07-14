import Seo from "../components/Seo";

const SUPPORT_EMAIL = "support@rap-infinite.online";

export default function Contact() {
  return (
    <main className="container legal-page">
      <Seo
        title="Contacto y soporte"
        description="Canales oficiales de contacto, soporte y reporte de seguridad de Appsem Store."
        path="/contact"
      />
      <span className="eyebrow">Ayuda</span>
      <h1>Contacto y soporte</h1>
      <p>
        Para recibir una respuesta útil, indica el nombre de la aplicación, versión instalada,
        modelo del dispositivo, versión de Android y una descripción clara del problema.
      </p>

      <section>
        <h2>Soporte general</h2>
        <p>
          Correo oficial: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>Tiempo habitual de respuesta: entre 1 y 3 días laborables.</p>
        <a className="primary-button" href={`mailto:${SUPPORT_EMAIL}?subject=Soporte%20Appsem%20Store`}>
          Escribir a soporte
        </a>
      </section>

      <section>
        <h2>Seguridad y vulnerabilidades</h2>
        <p>
          No publiques contraseñas, códigos, documentos ni otros datos sensibles en los comentarios.
          Para reportar una vulnerabilidad, escribe al mismo correo con el asunto
          <strong> “Reporte de seguridad”</strong> y explica los pasos para reproducirla.
        </p>
        <a className="outline-button" href={`mailto:${SUPPORT_EMAIL}?subject=Reporte%20de%20seguridad`}>
          Reportar un problema de seguridad
        </a>
      </section>

      <section>
        <h2>Sitio del desarrollador</h2>
        <a className="outline-button" href="https://appsmart-technology.vercel.app" target="_blank" rel="noopener noreferrer">
          Visitar AppsMart Technology
        </a>
      </section>
    </main>
  );
}
