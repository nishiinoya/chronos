// frontend/src/ui/CalendarMonth.jsx
import {
  addDays,
  isSameDay,
  isSameMonth,
  format,
  startOfWeek,
  startOfDay,
} from "date-fns";
import EventPill from "./EventPill.jsx";

function toDate(d) {
  return d instanceof Date ? d : new Date(d);
}

export default function CalendarMonth({
  cursor,
  events,
  calendars,
  onDayClick,
  onEventClick,
}) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const monthStartDow = startOfWeek(
    new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    { weekStartsOn: 1 }
  );
  const days = Array.from({ length: 42 }, (_, i) => addDays(monthStartDow, i));

  const calById = Object.fromEntries(calendars.map((c) => [c.id, c]));

  // Bucket events by day key yyyy-MM-dd (covers the whole 6x7 grid)
  const bucket = {};
  if (events?.length) {
    const gridStart = startOfDay(days[0]);
    const gridEnd = startOfDay(addDays(days[0], 42));
    for (const evt of events) {
      const s0 = toDate(evt.start);
      const e0 = toDate(evt.end ?? evt.start);
      const s = s0 < gridStart ? gridStart : s0;
      const e = e0 > gridEnd ? gridEnd : e0;

      let pushedAny = false;
      for (let d = startOfDay(s); d < e; d = addDays(d, 1)) {
        const key = format(d, "yyyy-MM-dd");
        const arr = (bucket[key] ||= []);
        if (!arr.some((x) => x.id === evt.id)) arr.push(evt);
        pushedAny = true;
      }
      if (!pushedAny) {
        const key = format(startOfDay(s0), "yyyy-MM-dd");
        const arr = (bucket[key] ||= []);
        if (!arr.some((x) => x.id === evt.id)) arr.push(evt);
      }
    }
  }

  // -------------------------------------------------
  // MOBILE: Month as agenda (only days with events)
  // -------------------------------------------------
  if (isMobile) {
    const daysOfMonth = days.filter((d) => isSameMonth(d, cursor));

    const daysWithEvents = daysOfMonth.filter((d) => {
      const key = format(d, "yyyy-MM-dd");
      return (bucket[key] || []).length > 0;
    });

    if (daysWithEvents.length === 0) {
      return (
        <div className="month-mobile">
          <section className="week-mobile-day">
            <header className="week-mobile-day-header">
              <span className="week-mobile-day-title">
                {format(cursor, "MMMM yyyy")}
              </span>
            </header>
            <div className="week-mobile-day-events">
              <div className="week-mobile-empty">No events this month</div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="month-mobile">
        {daysWithEvents.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const todaysEvents = (bucket[key] || [])
            .slice()
            .sort(
              (a, b) => toDate(a.start).getTime() - toDate(b.start).getTime()
            );

          return (
            <section
              key={key}
              className="week-mobile-day"
              onClick={() => onDayClick?.(d)}
            >
              <header className="week-mobile-day-header">
                <span className="week-mobile-day-title">
                  {format(d, "EEE d MMM")}
                </span>
                {isSameDay(d, new Date()) && (
                  <span className="week-mobile-today-pill">Today</span>
                )}
              </header>

              <div className="week-mobile-day-events">
                {todaysEvents.map((evt) => {
                  const color = calById[evt.calendarId]?.color || "#6c6cff";
                  const type = evt.type;
                  const isHoliday =
                    evt.calendarId === "system_holidays" ||
                    evt.source === "holidays";
                  const isAllDayLike = evt.allDay || isHoliday;

                  let icon = " ";
                  if (type === "arrangement") icon = "📅";
                  else if (type === "reminder") icon = "⏰";
                  else if (type === "task") icon = "📝";

                  let timeLabel = "";
                  if (!isAllDayLike) {
                    const startTime = format(toDate(evt.start), "HH:mm");
                    const endTime = format(
                      toDate(evt.end ?? evt.start),
                      "HH:mm"
                    );
                    if (type === "arrangement") {
                      timeLabel = `${startTime}–${endTime}`;
                    } else if (type === "reminder") {
                      timeLabel = startTime;
                    } else if (type === "task") {
                      timeLabel = startTime;
                    }
                  } else {
                    timeLabel = "All day";
                  }

                  return (
                    <button
                      key={evt.id}
                      className="week-mobile-pill"
                      style={{
                        borderColor: color,
                        borderLeftColor: color,
                        background: `rgba(99,102,241,0.12)`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(evt);
                      }}
                    >
                      <span
                        className="pill-dot"
                        style={{ background: color }}
                      />
                      <div className="week-mobile-pill-main">
                        <div className="week-mobile-pill-top">
                          <span className="week-mobile-pill-icon">{icon}</span>
                          {timeLabel && (
                            <span className="week-mobile-pill-time">
                              {timeLabel}
                            </span>
                          )}
                        </div>
                        <div className="week-mobile-pill-title">
                          {evt.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  // -------------------------------------------------
  // DESKTOP: original month grid
  // -------------------------------------------------

  return (
    <div className="month-grid">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div key={d} className="dow">
          {d}
        </div>
      ))}
      {days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const todaysEvents = bucket[key] || [];
        const faded = !isSameMonth(d, cursor);
        const today = isSameDay(d, new Date());
        return (
          <div
            key={key}
            className={`cell ${faded ? "faded" : ""} ${today ? "today" : ""}`}
            onDoubleClick={() => onDayClick?.(d)}
          >
            <div className="cell-top">
              <span className="date-num">{format(d, "d")}</span>
            </div>
            <div className="events">
              {todaysEvents.map((evt) => (
                <EventPill
                  key={`${evt.id}-${key}`}
                  type={evt.type}
                  title={evt.title}
                  color={calById[evt.calendarId]?.color || "#6c6cff"}
                  time={
                    evt.allDay || evt.calendarId === "system_holidays"
                      ? ""
                      : isSameDay(toDate(evt.start), d)
                      ? format(toDate(evt.start), "p")
                      : ""
                  }
                  onClick={() => onEventClick?.(evt)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
