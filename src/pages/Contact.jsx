import Seo from "../components/Seo";

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
        Para soporte de una aplicación, usa primero los enlaces de privacidad, términos o seguridad incluidos en su ficha.
        Para consultas generales sobre Appsem Store o AppsMart Technology, utiliza el sitio oficial del desarrollador.
      </p>
      <section>
        <h2>Soporte de aplicaciones</h2>
        <p>
          Incluye en tu consulta el nombre de la app, versión instalada, modelo del dispositivo, versión de Android y una descripción clara del problema.
        </p>
      </section>
      <section>
        <h2>Seguridad y vulnerabilidades</h2>
        <p>
          No publiques datos sensibles en comentarios. Usa el canal de reporte de seguridad de la app cuando esté disponible en su ficha.
        </p>
      </section>
      <section>
        <h2>Canal oficial</h2>
        <a className="outline-button" href="https://appsmart-technology.vercel.app" target="_blank" rel="noopener noreferrer">
          Contactar mediante AppsMart Technology
        </a>
      </section>
    </main>
  );
}
