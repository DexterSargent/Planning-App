import React, { useState } from 'react';
import { Settings, Plus, Zap, Utensils, Dumbbell, ShoppingCart } from 'lucide-react';
import { getMonthTitle, formatDateFull, CALENDAR_ROW_HEIGHT } from '../../utils/dateUtils';
import WeeklyTemplateView from './WeeklyTemplateView';
import WeeklyMealPlannerModal from './WeeklyMealPlannerModal';
import WeeklyWorkoutPlannerModal from './WeeklyWorkoutPlannerModal';
import { fetchJson } from '../../services/api';

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
  onGenerateGroceryList,
  weeklyTemplate,
  fetchWeeklyTemplate,
  recipes = [],
  refreshAll,
  workouts,
  workoutExercises,
  userSettings,
}) {
  const [mealPlannerModalVisible, setMealPlannerModalVisible] = useState(false);
  const [workoutPlannerModalVisible, setWorkoutPlannerModalVisible] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const handleOpenMealPlanner = async () => {
    if (refreshAll) await refreshAll();
    setMealPlannerModalVisible(true);
  };

  const handleOpenWorkoutPlanner = async () => {
    if (refreshAll) await refreshAll();
    setWorkoutPlannerModalVisible(true);
  };

  const handleApplyTemplate = async () => {
    if (!weekDates || !weekDates[0]?.date) return;
    setApplyingTemplate(true);
    try {
      await fetchJson('/schedule/template/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start_date: weekDates[0].date }),
      });
      if (refreshAll) await refreshAll();
    } catch (err) {
      console.error('Error applying template:', err);
    } finally {
      setApplyingTemplate(false);
    }
  };
  return (
    <section className="schedule-layout schedule-calendar-layout">
      <div className="schedule-header schedule-calendar-header">
        <div className="view-tabs">
          {['month', 'week', 'day', 'template'].map((view) => (
            <button
              key={view}
              className={scheduleView === view ? 'active' : ''}
              onClick={() => setScheduleView(view)}
            >
              {view === 'month' ? 'Month' : view === 'week' ? 'Week' : view === 'day' ? 'Day' : 'Weekly Template'}
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
            <div className="week-view-header schedule-nav-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="icon-button" onClick={() => changeWeek(-1)}>
                ‹
              </button>
              <div className="schedule-view-title">{weekRangeLabel}</div>
              <button className="icon-button" onClick={() => changeWeek(1)}>
                ›
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="secondary-button"
                  style={{ fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                  onClick={handleApplyTemplate}
                  disabled={applyingTemplate}
                  title="Autopopulate this week with your recurring blocks and meal times from your template"
                >
                  {applyingTemplate ? 'Filling Week...' : <><Zap size={16} className="inline-icon" /> Autopopulate Week</>}
                </button>
                <button
                  className="secondary-button"
                  style={{ fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981' }}
                  onClick={handleOpenMealPlanner}
                >
                  <Utensils size={16} className="inline-icon" /> Plan Meals for this Week
                </button>
                <button
                  className="secondary-button"
                  style={{ fontSize: '0.85rem', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                  onClick={handleOpenWorkoutPlanner}
                >
                  <Dumbbell size={16} className="inline-icon" /> Plan Workouts for this Week
                </button>
                <button
                  className="secondary-button"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => onGenerateGroceryList && onGenerateGroceryList(weekDates[0]?.date, weekDates[weekDates.length - 1]?.date, weekRangeLabel)}
                >
                  <ShoppingCart size={16} className="inline-icon" /> Generate grocery list
                </button>
              </div>
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
                        <strong>{event.is_completed ? '✓ ' : ''}{event.title || event.event_type.replace(/ .*/, '')}</strong>
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
                        <strong>{event.is_completed ? '✓ ' : ''}{event.title || event.event_type.replace(/ .*/, '')}</strong>
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

        {scheduleView === 'template' && (
          <WeeklyTemplateView
            weeklyTemplate={weeklyTemplate}
            fetchWeeklyTemplate={fetchWeeklyTemplate}
            eventColors={eventColors}
            workouts={workouts}
            userSettings={userSettings}
          />
        )}
      </div>

      <WeeklyMealPlannerModal
        visible={mealPlannerModalVisible}
        onClose={() => setMealPlannerModalVisible(false)}
        weekDates={weekDates}
        recipes={recipes}
        events={events}
        refreshAll={refreshAll}
      />
      
      <WeeklyWorkoutPlannerModal
        visible={workoutPlannerModalVisible}
        onClose={() => setWorkoutPlannerModalVisible(false)}
        weekDates={weekDates}
        workouts={workouts}
        workoutExercises={workoutExercises}
        events={events}
        refreshAll={refreshAll}
      />
    </section>
  );
}
