export default function CalendarHeader({
  title,
  view = "month",
  onChangeView,
  onPrev,
  onNext,
  onToday,
  onCreateEvent,
  onOpenSidebar, // mobile hamburger
}) {
  return (
    <header className="header">
      <div className="left">
        {/* Hamburger for mobile (hidden on desktop via CSS) */}
        <button
          type="button"
          className="hamburger-btn"
          onClick={() => onOpenSidebar?.()}
          aria-label="Open sidebar"
        >
          ☰
        </button>

        <button className="btn" onClick={onToday}>
          Today
        </button>
        <button className="btn" onClick={onPrev}>
          ‹
        </button>
        <button className="btn" onClick={onNext}>
          ›
        </button>

        <h1 className="title">{title}</h1>

        {/* Create event button next to title */}
        <button
          type="button"
          className="btn icon"
          onClick={onCreateEvent}
          aria-label="Create event"
          style={{ marginLeft: 8 }}
        >
          +
        </button>
      </div>

      <div className="right">
        <select
          className="input-select"
          value={view}
          onChange={(e) => onChangeView?.(e.target.value)}
        >
          <option value="month">Month</option>
          <option value="week">Week</option>
          <option value="day">Day</option>
        </select>
      </div>
    </header>
  );
}
