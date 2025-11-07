import { useMemo, useState } from "react";
import "./App.css";
import chronosLogo from "./assets/chronos-logo.png";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const VIEW_OPTIONS = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "3day", label: "3 days" },
];

const DEFAULT_FORM_STATE = {
  title: "",
  startTime: "",
  endTime: "",
  description: "",
  category: "arrangement",
};

const createEmptyFormState = () => ({ ...DEFAULT_FORM_STATE });

const parseDateInput = value => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const formatCategoryLabel = value => {
  if (!value) return "Event";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(anchorDate, viewMode) {
  const base = new Date(anchorDate);
  base.setHours(0, 0, 0, 0);
  const todayKey = new Date().toDateString();

  if (viewMode === "month") {
    const year = base.getFullYear();
    const month = base.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const startDate = new Date(startOfMonth);
    startDate.setDate(startOfMonth.getDate() - startOfMonth.getDay());

    const endDate = new Date(endOfMonth);
    endDate.setDate(endOfMonth.getDate() + (6 - endOfMonth.getDay()));

    const days = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      days.push({
        date: new Date(cursor),
        isCurrentMonth: cursor.getMonth() === month,
        isToday: cursor.toDateString() === todayKey,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  const totalDays = viewMode === "week" ? 7 : 3;
  if (viewMode === "week") {
    base.setDate(base.getDate() - base.getDay());
  }

  const days = [];
  for (let i = 0; i < totalDays; i += 1) {
    const pointer = new Date(base);
    pointer.setDate(base.getDate() + i);
    days.push({
      date: pointer,
      isCurrentMonth: viewMode === "month" || viewMode === "week"
        ? pointer.getMonth() === anchorDate.getMonth()
        : true,
      isToday: pointer.toDateString() === todayKey,
    });
  }

  return days;
}

function formatDateRange(startDate, endDate) {
  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    return startDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const sameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth) {
    const monthName = startDate.toLocaleDateString(undefined, { month: "long" });
    const startDay = startDate.toLocaleDateString(undefined, { day: "numeric" });
    const endDay = endDate.toLocaleDateString(undefined, { day: "numeric" });
    const year = startDate.getFullYear();
    return `${monthName} ${startDay} – ${endDay}, ${year}`;
  }

  const startLabel = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const endLabel = endDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export default function App() {
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventsByDate, setEventsByDate] = useState({});
  const [formData, setFormData] = useState(createEmptyFormState);
  const [formDateValue, setFormDateValue] = useState(() => getDateKey(new Date()));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [focusedEvent, setFocusedEvent] = useState(null);
  const [viewMode, setViewMode] = useState("month");

  const calendarDays = useMemo(
    () => buildCalendarDays(activeDate, viewMode),
    [activeDate, viewMode],
  );

  const periodLabel = useMemo(() => {
    if (viewMode === "month") {
      return activeDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }
    if (calendarDays.length === 0) {
      return "";
    }
    const start = calendarDays[0].date;
    const end = calendarDays[calendarDays.length - 1].date;
    return formatDateRange(start, end);
  }, [activeDate, calendarDays, viewMode]);

  const handlePrevPeriod = () => {
    setActiveDate(prev => {
      if (viewMode === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      }
      const step = viewMode === "week" ? 7 : 3;
      const next = new Date(prev);
      next.setDate(next.getDate() - step);
      return next;
    });
  };

  const handleNextPeriod = () => {
    setActiveDate(prev => {
      if (viewMode === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      }
      const step = viewMode === "week" ? 7 : 3;
      const next = new Date(prev);
      next.setDate(next.getDate() + step);
      return next;
    });
  };

  const handleToday = () => {
    const today = new Date();
    if (viewMode === "month") {
      setActiveDate(new Date(today.getFullYear(), today.getMonth(), 1));
    } else {
      setActiveDate(today);
    }
  };

  const openEventForm = date => {
    const baseDate = date ? new Date(date) : new Date();
    setFormDateValue(getDateKey(baseDate));
    setFormData(createEmptyFormState());
    setIsFormOpen(true);
  };

  const handleSelectDate = date => {
    const nextDate = new Date(date);
    if (viewMode === "month") {
      setActiveDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    } else {
      setActiveDate(nextDate);
    }
    setSelectedDate(nextDate);
    setFocusedEvent(null);
    openEventForm(nextDate);
  };

  const handleFormChange = event => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateInputChange = event => {
    setFormDateValue(event.target.value);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  const handleAddEvent = event => {
    event.preventDefault();
    if (!formData.title.trim() || !formDateValue) {
      return;
    }

    const eventDate = parseDateInput(formDateValue);
    if (!eventDate || Number.isNaN(eventDate.getTime())) {
      return;
    }

    const dayKey = getDateKey(eventDate);
    const newEvent = {
      id: Date.now(),
      title: formData.title.trim(),
      startTime: formData.startTime,
      endTime: formData.endTime,
      description: formData.description.trim(),
      category: formData.category,
    };

    setEventsByDate(prev => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] ?? []), newEvent],
    }));

    setFormData(createEmptyFormState());
    setFocusedEvent({ ...newEvent, date: eventDate });
    setSelectedDate(eventDate);
    setFormDateValue(getDateKey(eventDate));
    setIsFormOpen(false);
  };

  const selectedDayKey = selectedDate ? getDateKey(selectedDate) : null;

  const handleChangeViewMode = mode => {
    setViewMode(mode);
    const base = selectedDate ?? activeDate ?? new Date();
    if (mode === "month") {
      setActiveDate(new Date(base.getFullYear(), base.getMonth(), 1));
    } else {
      setActiveDate(base);
    }
  };

  const formDatePreview = useMemo(() => {
    const parsed = parseDateInput(formDateValue);
    return parsed
      ? parsed.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
  }, [formDateValue]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand" role="banner">
          <img className="brand-logo" src={chronosLogo} alt="Chronos logo" />
          <span className="brand-text">chronos</span>
        </div>
        <div className="header-actions">
          <button className="header-link" type="button"> Profile
          </button>
          <button className="header-link" type="button">
            Calendars
          </button>
          <button className="header-link" type="button">
            Settings
          </button>
        </div>
      </header>

      {isFormOpen ? (
        <div className="event-form-overlay" role="dialog" aria-modal="true">
          <div className="event-form-card">
            <div className="event-form-header">
              <div>
                <h3>Create Event</h3>
                <p className="event-form-subtitle">
                  {formDatePreview
                    ? `Scheduled for ${formDatePreview}`
                    : "Choose a date for your event"}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={handleCloseForm}
                aria-label="Close event form"
              >
                X
              </button>
            </div>
            <form onSubmit={handleAddEvent}>
              <label className="form-field">
                <span>Title</span>
                <input
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Team sync, Doctor appointment..."
                  required
                />
              </label>
              <label className="form-field">
                <span>Date</span>
                <input
                  name="date"
                  type="date"
                  value={formDateValue}
                  onChange={handleDateInputChange}
                  required
                />
              </label>
              <div className="form-row">
                <label className="form-field">
                  <span>Start Time</span>
                  <input
                    name="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={handleFormChange}
                  />
                </label>
                <label className="form-field">
                  <span>End Time</span>
                  <input
                    name="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={handleFormChange}
                  />
                </label>
              </div>
              <label className="form-field">
                <span>Category</span>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                >
                  <option value="arrangement">Arrangement</option>
                  <option value="reminder">Reminder</option>
                  <option value="task">Task</option>
                </select>
              </label>
              <label className="form-field">
                <span>Description</span>
                <textarea
                  name="description"
                  rows="4"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Add notes or meeting links"
                />
              </label>
              <div className="form-actions">
                <button type="button" className="ghost-button" onClick={handleCloseForm}>
                  Cancel
                </button>
                <button type="submit" className="primary-action">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <main className="app-main">
        {focusedEvent ? (
          <section className="event-highlight" aria-live="polite">
            <div className="highlight-meta">
              <span className="highlight-label">Selected Event</span>
              <span className="highlight-date">
                {focusedEvent.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="highlight-content">
              <h2>{focusedEvent.title}</h2>
              <div className="highlight-category">
                {formatCategoryLabel(focusedEvent.category)}
              </div>
              <div className="highlight-time">
                {[focusedEvent.startTime, focusedEvent.endTime]
                  .filter(Boolean)
                  .join(" – ") || "All day"}
              </div>
              {focusedEvent.description ? <p>{focusedEvent.description}</p> : null}
            </div>
          </section>
        ) : null}

        <section className="calendar-panel">
          <div className="calendar-toolbar">
            <div className="toolbar-left">
              <button
                className="toolbar-button"
                type="button"
                onClick={handlePrevPeriod}
                aria-label="Previous period"
              >
                ‹
              </button>
              <button
                className="toolbar-button"
                type="button"
                onClick={handleToday}
              >
                Today
              </button>
              <button
                className="toolbar-button"
                type="button"
                onClick={handleNextPeriod}
                aria-label="Next period"
              >
                ›
              </button>
            </div>
            <div className="toolbar-right">
              <div className="view-toggle" role="group" aria-label="Calendar view">
                {VIEW_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={[
                      "view-toggle-button",
                      option.id === viewMode ? "active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleChangeViewMode(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="month-label">{periodLabel}</div>
            </div>
          </div>

          <div className="calendar-grid" role="grid" aria-label={`Calendar for ${periodLabel}`}>
            <div
              className={[
                "weekdays-row",
                viewMode === "month"
                  ? "mode-month"
                  : viewMode === "week"
                    ? "mode-week"
                    : "mode-3day",
              ].join(" ")}
            >
              {(viewMode === "month" ? WEEK_DAYS : calendarDays.map(({ date }) =>
                date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })
              )).map(label => (
                <div key={label} role="columnheader" className="weekday">
                  {label}
                </div>
              ))}
            </div>
            <div className="days-scroll">
              <div
                className={[
                  "days-grid",
                  viewMode === "month"
                    ? "mode-month"
                    : viewMode === "week"
                      ? "mode-week"
                      : "mode-3day",
                ].join(" ")}
              >
              {calendarDays.map(({ date, isCurrentMonth, isToday }) => {
                const dayKey = getDateKey(date);
                const isSelected = selectedDayKey === dayKey;
                const eventCount = eventsByDate[dayKey]?.length ?? 0;

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    role="gridcell"
                    onClick={() => handleSelectDate(date)}
                    className={[
                      "day-cell",
                      isCurrentMonth ? "current-month" : "adjacent-month",
                      isToday ? "today" : "",
                      isSelected ? "selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="date-number">{date.getDate()}</span>
                    {eventCount > 0 ? (
                      <span className="event-count" aria-label={`${eventCount} events`}>
                        {eventCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
