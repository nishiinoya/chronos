// frontend/src/ui/CalendarDay.jsx
import { useMemo, useEffect, useRef, useState } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  max,
  min,
  setHours,
  setMinutes,
  isSameDay,
} from "date-fns";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MIN_BLOCK_MINUTES = 20;

function toDate(d) {
  return d instanceof Date ? d : new Date(d);
}

function hexToRgba(hex, a = 0.18) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#6c6cff");
  const r = parseInt(m?.[1] || "6c", 16);
  const g = parseInt(m?.[2] || "6c", 16);
  const b = parseInt(m?.[3] || "ff", 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function layoutDay(events, dayStart, dayEnd, pxPerMinute) {
  const slices = events
    .map((ev) => {
      const isHoliday =
        ev.calendarId === "system_holidays" || ev.source === "holidays";

      if (ev.allDay && !isHoliday) return null;

      const s0 = ev._visualStart ?? toDate(ev.start);
      const e0 = ev._visualEnd ?? toDate(ev.end ?? ev.start);

      const s = max([s0, dayStart]);
      const e = min([e0, dayEnd]);

      if (e <= s) return null;

      return { ev, start: s, end: e };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const groups = [];
  for (const it of slices) {
    let placed = false;
    for (const g of groups) {
      const overlapsGroup = g.some(
        (x) => !(it.end <= x.start || it.start >= x.end)
      );
      if (overlapsGroup) {
        g.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([it]);
  }

  const positioned = [];
  for (const g of groups) {
    const columns = [];
    for (const it of g) {
      let idx = 0;
      while (true) {
        const col = columns[idx] || (columns[idx] = []);
        const collides = col.some(
          (x) => !(it.end <= x.start || it.start >= x.end)
        );
        if (!collides) {
          col.push(it);
          break;
        }
        idx++;
      }
    }
    const colCount = columns.length;
    columns.forEach((col, idx) => {
      const leftPct = (idx / colCount) * 100;
      const widthPct = 100 / colCount;
      for (const it of col) {
        const top =
          Math.max(0, differenceInMinutes(it.start, dayStart)) * pxPerMinute;
        const height = Math.max(
          14,
          differenceInMinutes(it.end, it.start) * pxPerMinute
        );
        positioned.push({
          event: it.ev,
          top,
          height,
          leftPct,
          widthPct,
        });
      }
    });
  }
  return positioned;
}

export default function CalendarDay({
  cursor,
  events = [],
  calendars = [],
  onSlotDoubleClick,
  onEventClick,
}) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const dayStart = startOfDay(cursor);
  const dayEnd = endOfDay(cursor);

  const calById = useMemo(
    () => Object.fromEntries(calendars.map((c) => [c.id, c])),
    [calendars]
  );

  const hourRef = useRef(null);
  const [hourHeight, setHourHeight] = useState(60);
  const pxPerMinute = hourHeight / 60;

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const h = hourRef.current?.offsetHeight;
    if (h && h > 0) setHourHeight(h);
  }, []);

  // update "now" every 10s so line moves smoothly-ish
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  // Normalize events (visual interval) and filter to this day
  const dayEvents = useMemo(() => {
    const normalized = events.map((ev) => {
      const realStart = toDate(ev.start);
      const realEnd = toDate(ev.end ?? ev.start);

      let visualStart = realStart;
      let visualEnd = realEnd;

      if (visualEnd <= visualStart) {
        visualEnd = new Date(
          visualStart.getTime() + MIN_BLOCK_MINUTES * 60 * 1000
        );
      }

      return {
        ...ev,
        _visualStart: visualStart,
        _visualEnd: visualEnd,
      };
    });

    return normalized.filter(
      (ev) => ev._visualEnd > dayStart && ev._visualStart < dayEnd
    );
  }, [events, dayStart, dayEnd]);

  const allDayEvents = useMemo(
    () =>
      dayEvents.filter((e) => e.allDay && e.calendarId !== "system_holidays"),
    [dayEvents]
  );

  const timedEvents = useMemo(
    () =>
      dayEvents.filter((e) => !e.allDay || e.calendarId === "system_holidays"),
    [dayEvents]
  );

  // -------------------------------------------------
  // MOBILE: agenda for this day
  // -------------------------------------------------
  if (isMobile) {
    const sorted = timedEvents.slice().sort((a, b) => {
      return toDate(a.start).getTime() - toDate(b.start).getTime();
    });

    return (
      <div className="day-mobile">
        <header className="day-mobile-header">
          <span className="week-mobile-day-title">
            {format(cursor, "EEEE, d MMM yyyy")}
          </span>
        </header>

        <div className="day-mobile-events">
          {allDayEvents.length > 0 && (
            <div className="day-mobile-all-day">
              {allDayEvents.map((e) => {
                const color = calById[e.calendarId]?.color || "#6c6cff";
                return (
                  <div
                    key={e.id}
                    className="all-day-pill"
                    style={{
                      borderRadius: 999,
                      padding: "2px 8px",
                      marginRight: 4,
                      background: hexToRgba(color, 0.15),
                      border: `1px solid ${color}`,
                      display: "inline-block",
                      fontSize: 11,
                    }}
                    onClick={() => onEventClick?.(e)}
                  >
                    {e.title}
                  </div>
                );
              })}
            </div>
          )}

          {sorted.length === 0 && allDayEvents.length === 0 && (
            <div className="week-mobile-empty">No events</div>
          )}

          {sorted.map((ev) => {
            const color = calById[ev.calendarId]?.color || "#6c6cff";

            const type = ev.type;
            const isHoliday =
              ev.calendarId === "system_holidays" || ev.source === "holidays";
            const isAllDayLike = ev.allDay || isHoliday;

            let icon = " ";
            if (type === "arrangement") icon = "📅";
            else if (type === "reminder") icon = "⏰";
            else if (type === "task") icon = "📝";

            let timeLabel = "";
            if (!isAllDayLike) {
              const startTime = format(toDate(ev.start), "HH:mm");
              const endTime = format(toDate(ev.end ?? ev.start), "HH:mm");
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
                key={ev.id}
                className="week-mobile-pill"
                style={{
                  borderColor: color,
                  borderLeftColor: color,
                  background: hexToRgba(color, 0.18),
                }}
                onClick={() => onEventClick?.(ev)}
              >
                <span className="pill-dot" style={{ background: color }} />
                <div className="week-mobile-pill-main">
                  <div className="week-mobile-pill-top">
                    <span className="week-mobile-pill-icon">{icon}</span>
                    {timeLabel && (
                      <span className="week-mobile-pill-time">{timeLabel}</span>
                    )}
                  </div>
                  <div className="week-mobile-pill-title">{ev.title}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------
  // DESKTOP: hour grid with current time line
  // -------------------------------------------------

  const positioned = useMemo(
    () => layoutDay(dayEvents, dayStart, dayEnd, pxPerMinute),
    [dayEvents, dayStart, dayEnd, pxPerMinute]
  );

  const showNowLine =
    isSameDay(now, cursor) && now >= dayStart && now <= dayEnd;

  const nowTop = showNowLine
    ? ((now.getTime() - dayStart.getTime()) / 60000) * pxPerMinute
    : null;

  return (
    <div className="day-wrap">
      <div className="day-header">{format(cursor, "EEEE, d MMMM yyyy")}</div>

      <div className="day-body">
        <div className="time-col">
          {HOURS.map((h, i) => (
            <div key={h} ref={i === 0 ? hourRef : null} className="hour">
              {`${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        <div className="day-col" style={{ position: "relative" }}>
          {HOURS.map((h) => {
            const slot = setMinutes(setHours(cursor, h), 0);
            return (
              <div
                key={h}
                className="slot"
                style={{ height: hourHeight }}
                onDoubleClick={() => onSlotDoubleClick?.(slot)}
                onClick={() => onSlotDoubleClick?.(slot)}
              />
            );
          })}

          {allDayEvents.length > 0 && (
            <div className="day-all-day-strip">
              {allDayEvents.map((e) => {
                const color = calById[e.calendarId]?.color || "#6c6cff";
                return (
                  <div
                    key={e.id}
                    className="all-day-pill"
                    style={{
                      borderRadius: 999,
                      padding: "2px 8px",
                      marginRight: 4,
                      background: hexToRgba(color, 0.15),
                      border: `1px solid ${color}`,
                      display: "inline-block",
                      fontSize: 11,
                    }}
                    onClick={() => onEventClick?.(e)}
                  >
                    {e.title}
                  </div>
                );
              })}
            </div>
          )}

          <div
            className="overlay-events"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {showNowLine && (
              <div
                style={{
                  position: "absolute",
                  top: nowTop,
                  left: 0,
                  right: 0,
                  height: 0,
                  borderTop: "2px solid #4ade80",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 2,
                    transform: "translateY(-50%)",
                    fontSize: 10,
                    padding: "0 4px",
                    borderRadius: 4,
                    background: "rgba(0,0,0,0.7)",
                  }}
                >
                  {format(now, "HH:mm")}
                </div>
              </div>
            )}

            {positioned.map((p) => {
              const color = calById[p.event.calendarId]?.color || "#6c6cff";

              const type = p.event.type;
              const isHoliday =
                p.event.calendarId === "system_holidays" ||
                p.event.source === "holidays";
              const isAllDayLike = p.event.allDay || isHoliday;

              let timeLabel = "";
              let titleLabel = p.event.title;

              let icon = " ";
              if (type === "arrangement") icon = "📅";
              else if (type === "reminder") icon = "⏰";
              else if (type === "task") icon = "📝";

              if (!isAllDayLike) {
                const startTime = format(toDate(p.event.start), "HH:mm");
                const endTime = format(
                  toDate(p.event.end ?? p.event.start),
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
                timeLabel = "";
              }

              const pillBg = hexToRgba(color, 0.18);

              return (
                <div
                  key={p.event.id}
                  style={{
                    position: "absolute",
                    top: p.top,
                    left: `${p.leftPct}%`,
                    width: `${p.widthPct}%`,
                    height: p.height,
                    padding: 2,
                    boxSizing: "border-box",
                    cursor: "pointer",
                    pointerEvents: "auto",
                  }}
                  onClick={() => onEventClick?.(p.event)}
                  title={p.event.title}
                >
                  <button
                    className="pill"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderLeftColor: color,
                      background: pillBg,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      borderRadius: 5,
                      border: "1px solid " + color,
                      padding: "2px 6px",
                      boxSizing: "border-box",
                      overflow: "hidden",
                      textAlign: "left",
                    }}
                  >
                    <span
                      className="pill-dot"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: color,
                      }}
                    />
                    <span style={{ fontSize: 13 }}>{icon}</span>
                    <span className="pill-time">{timeLabel}</span>
                    <span
                      className="pill-title"
                      style={{
                        whiteSpace: "normal",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                      }}
                    >
                      {titleLabel}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
