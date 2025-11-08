export default function EventPill({ title, time, color, onClick }) 
{
    return (
        <button className="pill" style={{ borderLeftColor: color }} onClick={onClick} title={title}>
            <span className="pill-dot" style={{ background: color }} />
            <span className="pill-time">{time}</span>
            <span className="pill-title">{title}</span>
        </button>
    );
}
