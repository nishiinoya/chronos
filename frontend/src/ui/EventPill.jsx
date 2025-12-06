export default function EventPill({ title, time, color, type, onClick }) {
  let icon = null;
  if (type === "arrangement") icon = "📅";
  else if (type === "reminder") icon = "⏰";
  else if (type === "task") icon = "📝";
  else icon = "•";

  const background = `${color}22`; // subtle tint

  return (
    <button
      type="button"
      className="pill"
      style={{ background }}
      onClick={onClick}
    >
      <span className="pill-dot" style={{ background: color }} />

      <span className="pill-icon" aria-hidden="true" style={{ fontSize: 13 }}>
        {icon}
      </span>

      <span className="pill-time">{time}</span>

      <span className="pill-title">{title}</span>
    </button>
  );
}
