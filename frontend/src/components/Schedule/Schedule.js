import React from 'react';
import { getMonthTitle, formatDateFull, CALENDAR_ROW_HEIGHT } from '../../utils/dateUtils';

export default function Schedule({
  scheduleView,
  setScheduleView,
  setSelectedDate,
  openEventModal,
  eventColors,
  selectedDate,
  changeMonth,
  monthGrid,
  events,
  currentDay,
  changeWeek,
  weekRangeLabel,
  weekGridRef,
  weekDates,
  hourlyGrid,
  handleCellPointerDown,
  handleCellPointerUp,
  eventsByDate,
  dragInfo,
  handleEventPointerDown,
  handleEventPointerUp,
  handleEventResizeStart,
  changeDay,
  currentDayEvents,
}) {
  return (
    <section className="schedule-layout schedule-calendar-layout">
      <div className="schedule-header schedule-calendar-header">
        <div className="view-tabs">
          {['month', 'week', 'day'].map((view) => (
            <button
              key={view}
              className={scheduleView === view ? 'active' : ''}
              onClick={() => setScheduleView(view)}
            >
              {view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Day'}
            </button>
          ))}
        </div>
        <div className="schedule-actions">
          <button
            className="secondary-button today-button"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </button>
          <button
            className="primary-button add-event-button"
            onClick={() => openEventModal('work')}
          >
            <span className="button-icon">＋</span>
            Add event
          </button>
        </div>
        <div className="schedule-legend">
          {Object.entries(eventColors).map(([type, color]) => (
            <span key={type} className="legend-pill" style={{ background: color }}>
              {type.replace(/ .*/, '')}
            </span>
          ))}
        </div>
      </div>

      <div className="schedule-calendar-body">
        {scheduleView === 'month' && (
          <div className="month-view">
            <div className="month-view-header">
              <button className="icon-button" onClick={() => changeMonth(-1)}>
                ‹
              </button>
              <div className="month-title">{getMonthTitle(selectedDate)}</div>
              <button className="icon-button" onClick={() => changeMonth(1)}>
                ›
              </button>
            </div>
            <div className="month-weekdays">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday) => (
                <div key={weekday} className="weekday-label">
                  {weekday}
                </div>
              ))}
            </div>
            <div className="month-grid">
              {monthGrid.map((week, weekIndex) => (
                <div key={weekIndex} className="month-row">
                  {week.map((day) => {
                    const dayEvents = events.filter((event) => event.event_date === day.date);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        className={`month-cell ${day.active ? '' : 'disabled'} ${
                          day.date === currentDay ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedDate(new Date(day.date))}
                      >
                        <div className="month-cell-top">
                          <span>{day.label}</span>
                          {day.date === currentDay && <span className="current-dot" />}
                        </div>
                        <div className="month-cell-events">
                          {dayEvents.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className="event-chip"
                              style={{ background: eventColors[event.event_type] }}
                            >
                              {event.event_type.replace(/ .*/, '')}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {scheduleView === 'week' && (
          <div className="week-view">
            <div className="week-view-header schedule-nav-row">
              <button className="icon-button" onClick={() => changeWeek(-1)}>
                ‹
              </button>
              <div className="schedule-view-title">{weekRangeLabel}</div>
              <button className="icon-button" onClick={() => changeWeek(1)}>
                ›
              </button>
            </div>
            <div className="week-grid-wrapper" ref={weekGridRef}>
              <div className="week-grid week-calendar-grid">
                <div className="week-time-header" />
                {weekDates.map((day) => (
                  <div key={day.date} className="week-day-header">
                    <span>{day.weekday}</span>
                    <strong>{day.label}</strong>
                  </div>
                ))}
                {hourlyGrid.map((row) => (
                  <React.Fragment key={`week-row-${row.hour}`}>
                    <div className="week-time-cell">{row.label}</div>
                    {weekDates.map((day) => (
                      <button
                        key={`${day.date}-${row.hour}`}
                        type="button"
                        className="week-grid-cell"
                        onPointerDown={(e) => handleCellPointerDown(e, day.date)}
                        onPointerUp={(e) => handleCellPointerUp(e, day.date)}
                        data-hour={row.hour}
                      />
                    ))}
                  </React.Fragment>
                ))}
                {weekDates.map((day, index) =>
                  (eventsByDate[day.date] || []).map((event) => {
                    const [startHour, startMinutes] = (event.start_time || '00:00')
                      .split(':')
                      .map(Number);
                    const startTotal = startHour * 60 + (startMinutes || 0);
                    const duration = Number(event.duration_mins) || 60;
                    const top = 56 + (startTotal / 60) * CALENDAR_ROW_HEIGHT;
                    const height = Math.max(30, (duration / 60) * CALENDAR_ROW_HEIGHT);
                    const dragDelta =
                      dragInfo?.event?.id === event.id ? dragInfo.deltaMinutes || 0 : 0;
                    const offsetTop =
                      dragInfo?.type === 'move' && dragInfo.event.id === event.id
                        ? (dragDelta / 60) * CALENDAR_ROW_HEIGHT
                        : 0;
                    const resizeDelta =
                      dragInfo?.type === 'resize' && dragInfo.event.id === event.id
                        ? dragDelta
                        : 0;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className={`event-block week-event-block ${
                          dragInfo?.event?.id === event.id ? 'dragging' : ''
                        }`}
                        style={{
                          top: `${top + offsetTop}px`,
                          height: `${Math.max(
                            30,
                            height + (resizeDelta / 60) * CALENDAR_ROW_HEIGHT
                          )}px`,
                          left: `calc(120px + (${index} * ((100% - 120px) / 7)) + 8px)`,
                          width: `calc((100% - 120px) / 7 - 16px)`,
                          background: eventColors[event.event_type],
                        }}
                        onPointerDown={(e) => handleEventPointerDown(e, event)}
                        onPointerUp={(e) => handleEventPointerUp(e, event)}
                      >
                        <strong>{event.title || event.event_type.replace(/ .*/, '')}</strong>
                        <small>{event.start_time || 'All day'}</small>
                        <div
                          className="resize-handle"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handleEventResizeStart(e, event);
                          }}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {scheduleView === 'day' && (
          <div className="day-view">
            <div className="day-view-header schedule-nav-row">
              <button className="icon-button" onClick={() => changeDay(-1)}>
                ‹
              </button>
              <div>
                <span className="day-title">
                  {new Date(currentDay).toLocaleDateString(undefined, { weekday: 'long' })}
                </span>
                <strong>{formatDateFull(selectedDate)}</strong>
              </div>
              <button className="icon-button" onClick={() => changeDay(1)}>
                ›
              </button>
            </div>
            <div className="day-grid-wrapper" ref={weekGridRef}>
              <div className="day-grid day-calendar-grid">
                {hourlyGrid.map((row) => (
                  <React.Fragment key={`day-row-${row.hour}`}>
                    <div className="day-time-cell">{row.label}</div>
                    <button
                      key={`${row.hour}-cell`}
                      type="button"
                      className="day-grid-cell"
                      onPointerDown={(e) => handleCellPointerDown(e, currentDay)}
                      onPointerUp={(e) => handleCellPointerUp(e, currentDay)}
                      data-hour={row.hour}
                    />
                  </React.Fragment>
                ))}
                <div className="day-grid-events">
                  {(currentDayEvents || []).map((event) => {
                    const [startHour, startMinutes] = (event.start_time || '00:00')
                      .split(':')
                      .map(Number);
                    const startTotal = startHour * 60 + (startMinutes || 0);
                    const duration = Number(event.duration_mins) || 60;
                    const top = (startTotal / 60) * CALENDAR_ROW_HEIGHT;
                    const height = Math.max(30, (duration / 60) * CALENDAR_ROW_HEIGHT);
                    const dragDelta =
                      dragInfo?.event?.id === event.id ? dragInfo.deltaMinutes || 0 : 0;
                    const offsetTop =
                      dragInfo?.type === 'move' && dragInfo.event.id === event.id
                        ? (dragDelta / 60) * CALENDAR_ROW_HEIGHT
                        : 0;
                    const resizeDelta =
                      dragInfo?.type === 'resize' && dragInfo.event.id === event.id
                        ? dragDelta
                        : 0;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className={`event-block day-event-block ${
                          dragInfo?.event?.id === event.id ? 'dragging' : ''
                        }`}
                        style={{
                          top: `${top + offsetTop}px`,
                          height: `${Math.max(
                            30,
                            height + (resizeDelta / 60) * CALENDAR_ROW_HEIGHT
                          )}px`,
                          background: eventColors[event.event_type],
                        }}
                        onPointerDown={(e) => handleEventPointerDown(e, event)}
                        onPointerUp={(e) => handleEventPointerUp(e, event)}
                      >
                        <strong>{event.title || event.event_type.replace(/ .*/, '')}</strong>
                        <small>{event.start_time || 'All day'}</small>
                        <div
                          className="resize-handle"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handleEventResizeStart(e, event);
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
