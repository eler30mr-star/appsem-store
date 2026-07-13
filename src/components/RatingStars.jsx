import { useEffect, useState } from "react";
import { Star } from "lucide-react";

export default function RatingStars({ value = 0, interactive = false, onRate, size = 18 }) {
  const rating = Number(value || 0);
  const [selectedRating, setSelectedRating] = useState(rating);

  useEffect(() => {
    setSelectedRating(rating);
  }, [rating]);

  const visibleRating = interactive ? selectedRating : rating;

  function handleRate(star) {
    if (!interactive) return;
    setSelectedRating(star);
    onRate?.(star);
  }

  return (
    <div
      className={`rating-stars ${interactive ? "interactive" : ""}`}
      aria-label={`Valoración ${visibleRating} de 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = visibleRating >= star;

        return (
          <button
            aria-label={interactive ? `Valorar con ${star} estrellas` : undefined}
            className={filled ? "star filled" : "star"}
            disabled={!interactive}
            key={star}
            onClick={() => handleRate(star)}
            type="button"
          >
            <Star size={size} fill="currentColor" />
          </button>
        );
      })}
    </div>
  );
}
