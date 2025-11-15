export default function EventPill({ title, time, color, type, onClick }) 
{
    // choose icon by event type
    let icon = null;
    if (type === "arrangement") icon = "📅";
    else if (type === "reminder") icon = "⏰";
    else if (type === "task") icon = "📝";
    else icon = "•";

    // slight color variations depending on type (optional)
    // still keeps your main color but adds a subtle background tint
    const background = `${color}22`; // low-opacity color

    return (
        <button
            className="pill"
            onClick={onClick}
            title={title}
            style={{
                borderLeftColor: color,
                background: background,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
            }}
        >
            <span className="pill-dot" style={{ background: color }} />

            {/* icon */}
            <span style={{ fontSize: 13 }}>{icon}</span>

            {/* time */}
            <span className="pill-time">{time}</span>

            {/* title */}
            <span className="pill-title">{title}</span>
        </button>
    );
}
