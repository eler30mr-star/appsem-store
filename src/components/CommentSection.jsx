import { useState } from "react";
import { Send } from "lucide-react";
import RatingStars from "./RatingStars";
import { submitComment } from "../services/appsService";

export default function CommentSection({
  appId,
  comments = [],
  onCommentSent,
  rated,
  onRate,
  interactionMessage
}) {
  const [form, setForm] = useState({ name: "", comment: "" });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSending(true);
    setMessage("");

    try {
      await submitComment(appId, form);
      setForm({ name: "", comment: "" });
      setMessage("Comentario enviado. Se publicará cuando sea aprobado.");
      onCommentSent?.();
    } catch (error) {
      setMessage(error.message || "No se pudo enviar el comentario.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="detail-section comments-section app-reviews-section">
      <div className="app-review-heading">
        <h2>Califica esta app</h2>
        <p>Escribe tu opinión y experiencia</p>
      </div>

      <div className="app-review-rating">
        <RatingStars value={rated || 0} interactive={!rated} onRate={onRate} size={28} />
        {interactionMessage ? <p className="form-message">{interactionMessage}</p> : null}
      </div>

      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Nombre
            <input
              maxLength={60}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Tu nombre"
              required
              type="text"
              value={form.name}
            />
          </label>
        </div>
        <label>
          Comentario
          <textarea
            maxLength={800}
            onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
            placeholder="Comparte tu opinión sobre esta app"
            required
            rows={4}
            value={form.comment}
          />
        </label>
        <button className="primary-button" disabled={sending} type="submit">
          <Send size={18} /> {sending ? "Enviando..." : "Enviar comentario"}
        </button>
        {message ? <p className="form-message">{message}</p> : null}
      </form>

      <div className="comments-list">
        {comments.length ? (
          comments.map((item) => (
            <article className="comment-card" key={item.id}>
              <div className="comment-avatar">{String(item.name || "U").charAt(0).toUpperCase()}</div>
              <div>
                <h4>{item.name}</h4>
                <p>{item.comment}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="muted-text">Aún no hay comentarios aprobados para esta app.</p>
        )}
      </div>
    </section>
  );
}
