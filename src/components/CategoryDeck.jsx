import { thumbGradient } from "./ReportThumb.jsx";

// Kategori destesi: ust uste binmis kartlar; hover'da yelpaze gibi acilir.
// Tiklaninca o kategorinin tam listesine gecilir (onOpen).
export default function CategoryDeck({ category, onOpen, index = 0 }) {
  const reports = category.reports;
  const previews = reports.slice(0, 5); // desteye en fazla 5 kart yayilir
  const mid = (previews.length - 1) / 2;
  const hasNew = reports.some((r) => r.isNew);

  return (
    <button
      className="deck"
      style={{ animationDelay: `${index * 70}ms` }}
      onClick={() => onOpen(category)}
      title={`${category.name} — ${reports.length} rapor`}
    >
      <div className="deck-stage">
        <div className="deck-cards">
          {previews.map((r, i) => (
            <span
              key={r.id}
              className="deck-card"
              style={{
                "--i": i,
                "--mid": mid,
                background: thumbGradient(r.name + r.id),
              }}
            />
          ))}
        </div>
        <span className="deck-open-hint">Aç →</span>
      </div>

      <div className="deck-label">
        <h3>{category.name}</h3>
        <div className="deck-meta">
          <span className="deck-count">{reports.length} rapor</span>
          {hasNew && <span className="deck-newdot">● yeni</span>}
        </div>
      </div>
    </button>
  );
}
