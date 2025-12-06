// frontend/src/ui/CalendarWeek.jsx
import { useMemo, useRef, useEffect, useState } from "react";
import {
  addDays,
  startOfWeek,
  format,
  setHours,
  setMinutes,
  isSameDay,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  max,
  min,
} from "date-fns";

function toDate(d) {
  return d instanceof Date ? d : new Date(d);
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MIN_BLOCK_MINUTES = 20; // visual duration for zero-length events

function hexToRgba(hex, a = 0.18) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#6c6cff");
  const r = parseInt(m?.[1] || "6c", 16);
  const g = parseInt(m?.[2] || "6c", 16);
  const b = parseInt(m?.[3] || "ff", 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Desktop timed-event layout for a single day (grid).
 */
function layoutDay(events, dayStart, dayEnd, pxPerMinute) {
  const slices = events
    .map((ev) => {
      const isHoliday =
        ev.calendarId === "system_holidays" || ev.source === "holidays";

      // Non-holiday all-day stays in header; holidays render in grid
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

  // Build groups of overlapping intervals
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

export default function CalendarWeek({
  cursor,
  events = [],
  calendars = [],
  onSlotDoubleClick,
  onEventClick,
}) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const calById = useMemo(
    () => Object.fromEntries(calendars.map((c) => [c.id, c])),
    [calendars]
  );

  // simple runtime mobile check
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // Measure one .hour to sync slot height (desktop)
  const hourRef = useRef(null);
  const [hourHeight, setHourHeight] = useState(60);
  const pxPerMinute = hourHeight / 60;

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const h = hourRef.current?.offsetHeight;
    if (h && h > 0) setHourHeight(h);
  }, []);

  // update "now" every 10s for realtime-ish line
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  /**
   * Normalize events for the whole week:
   * - Compute real start/end
   * - Add _visualStart/_visualEnd with MIN_BLOCK_MINUTES if duration <= 0
   */
  const normalizedEvents = useMemo(() => {
    return events.map((ev) => {
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
  }, [events]);

  // ------------------------------------
  // MOBILE: agenda-style week list
  // ------------------------------------
  if (isMobile) {
    return (
      <div className="week-mobile">
        {days.map((d) => {
          const ds = startOfDay(d);
          const de = endOfDay(d);

          const dayEvents = normalizedEvents
            .filter((ev) => ev._visualEnd > ds && ev._visualStart < de)
            .sort(
              (a, b) => toDate(a.start).getTime() - toDate(b.start).getTime()
            );

          return (
            <section key={d.toISOString()} className="week-mobile-day">
              <header className="week-mobile-day-header">
                <span className="week-mobile-day-title">
                  {format(d, "EEE d MMM")}
                </span>
                {isSameDay(d, new Date()) && (
                  <span className="week-mobile-today-pill">Today</span>
                )}
              </header>

              <div className="week-mobile-day-events">
                {dayEvents.length === 0 && (
                  <div className="week-mobile-empty">No events</div>
                )}

                {dayEvents.map((ev) => {
                  const color = calById[ev.calendarId]?.color || "#6c6cff";

                  const type = ev.type;
                  const isHoliday =
                    ev.calendarId === "system_holidays" ||
                    ev.source === "holidays";
                  const isAllDayLike = ev.allDay || isHoliday;

                  let timeLabel = "";
                  let icon = " ";

                  if (type === "arrangement") icon = "📅";
                  else if (type === "reminder") icon = "⏰";
                  else if (type === "task") icon = "📝";

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
                        <div className="week-mobile-pill-title">{ev.title}</div>
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

  // ------------------------------------
  // DESKTOP: grid week view with variable day widths + timeline
  // ------------------------------------

  // Per-day "load" = number of events intersecting that day
  const dayWeights = useMemo(() => {
    const counts = new Map();
    let maxCount = 0;

    for (const d of days) {
      const ds = startOfDay(d);
      const de = endOfDay(d);
      const count = normalizedEvents.filter(
        (ev) => ev._visualEnd > ds && ev._visualStart < de
      ).length;
      const key = +ds;
      counts.set(key, count);
      if (count > maxCount) maxCount = count;
    }

    const weights = new Map();
    for (const [key, count] of counts.entries()) {
      if (maxCount === 0) {
        weights.set(key, 1);
      } else {
        const ratio = count / maxCount; // 0..1
        const weight = 0.8 + ratio * 0.8; // 0.8fr .. 1.6fr
        weights.set(key, weight);
      }
    }
    return weights;
  }, [days, normalizedEvents]);

  // Build a gridTemplateColumns string that matches the weights
  const columnTemplate = useMemo(() => {
    const dayCols = days
      .map((d) => {
        const key = +startOfDay(d);
        const w = dayWeights.get(key) ?? 1;
        return `${w.toFixed(2)}fr`;
      })
      .join(" ");
    // 80px time column + 7 day columns
    return `80px ${dayCols}`;
  }, [days, dayWeights]);

  // For each day, pick events whose visual interval intersects that day
  const positionedByDay = useMemo(() => {
    const map = new Map();
    for (const d of days) {
      const ds = startOfDay(d);
      const de = endOfDay(d);

      const dayEvents = normalizedEvents.filter(
        (ev) => ev._visualEnd > ds && ev._visualStart < de
      );

      map.set(+ds, layoutDay(dayEvents, ds, de, pxPerMinute));
    }
    return map;
  }, [days, normalizedEvents, pxPerMinute]);

  const allDayByDay = useMemo(() => {
    const map = new Map();
    for (const d of days) {
      const ds = startOfDay(d);
      const de = endOfDay(d);
      map.set(
        +ds,
        normalizedEvents.filter(
          (ev) =>
            ev.allDay &&
            ev.calendarId !== "system_holidays" &&
            ev._visualEnd > ds &&
            ev._visualStart < de
        )
      );
    }
    return map;
  }, [days, normalizedEvents]);

  return (
    <div className="week-wrap">
      <div
        className="week-header"
        style={{ gridTemplateColumns: columnTemplate }}
      >
        <div className="wh-cell time-col" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={`wh-cell ${isSameDay(d, new Date()) ? "today" : ""}`}
          >
            {format(d, "EEE d MMM")}
          </div>
        ))}
      </div>

      <div
        className="week-body"
        style={{ gridTemplateColumns: columnTemplate }}
      >
        <div className="time-col">
          {HOURS.map((h, i) => (
            <div key={h} ref={i === 0 ? hourRef : null} className="hour">
              {`${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {days.map((d) => {
          const ds = startOfDay(d);
          const key = +ds;
          const positioned = positionedByDay.get(key) || [];
          const allDay = allDayByDay.get(key) || [];

          const isToday = isSameDay(d, now);
          const showNowLine = isToday && now >= ds && now <= endOfDay(d);

          const nowTop = showNowLine
            ? ((now.getTime() - ds.getTime()) / 60000) * pxPerMinute
            : null;

          return (
            <div
              key={d.toISOString()}
              className="day-col"
              style={{ position: "relative" }}
            >
              {/* background slots */}
              {HOURS.map((h) => {
                const slot = setMinutes(setHours(d, h), 0);
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

              {/* overlay events */}
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

                  // base icon
                  let icon = " ";
                  if (type === "arrangement") icon = "📅";
                  else if (type === "reminder") icon = "⏰";
                  else if (type === "task") icon = "📝";

                  // time/label per type
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

                {/* all-day events placeholder */}
                {allDay.length > 0 && null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
