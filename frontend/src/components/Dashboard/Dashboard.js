import React from 'react';
import { formatDateFull } from '../../utils/dateUtils';

export default function Dashboard({
  selectedDate,
  freeTimeLabel,
  todayWorkouts,
  workouts,
  workoutExercises,
  eventColors,
  dashboardPerformance,
  performanceFieldKey,
  handlePerformanceChange,
  handleSavePerformance,
  todayMeals,
  openEventDetails,
  setActiveTab,
}) {
  return (
    <section className="dashboard-layout">
      <div className="dashboard-banner">
        <div className="date-heading">
          <span>Today</span>
          <strong>{formatDateFull(selectedDate)}</strong>
        </div>
        <div className="banner-meta">
          <span>Free time</span>
          <strong>{freeTimeLabel}</strong>
        </div>
      </div>

      <div className="dashboard-columns">
        <div className="dashboard-panel workout-panel">
          <div className="section-title">
            <h2>Today's scheduled workout</h2>
            <button onClick={() => setActiveTab('training')}>Build workout</button>
          </div>
          {todayWorkouts.length ? (
            todayWorkouts.map((event) => {
              const workout = workouts.find((item) => item.id === event.ref_workout_id);
              const details = workoutExercises[workout?.id] || [];
              return (
                <div key={event.id} className="card compact-card">
                  <div className="card-heading">
                    <div>
                      <strong>{event.title || workout?.name || 'Training'}</strong>
                      <span>{event.start_time || 'Anytime'}</span>
                    </div>
                    <span className="pill" style={{ background: eventColors[event.event_type] }}>
                      {event.event_type.replace(/ .*/, '')}
                    </span>
                  </div>
                  {workout ? (
                    <div className="workout-form">
                      {details.length ? (
                        details.map((exercise) => (
                          <div key={exercise.exercise_id} className="workout-row">
                            <div>
                              <strong>{exercise.name}</strong>
                              <small>
                                {exercise.sets}×{exercise.reps} · {exercise.weight || 'percent'}
                              </small>
                            </div>
                            <input
                              placeholder="Weights (e.g. 225,225,235)"
                              value={
                                dashboardPerformance[performanceFieldKey(event.id, exercise.exercise_id)] ||
                                ''
                              }
                              onChange={(e) =>
                                handlePerformanceChange(event.id, exercise.exercise_id, e.target.value)
                              }
                            />
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">Loading workout details...</div>
                      )}
                      <button
                        className="primary-button"
                        onClick={() => handleSavePerformance(event.id, workout)}
                      >
                        Save workout log
                      </button>
                    </div>
                  ) : (
                    <div className="empty-state">No workout linked to this event.</div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="empty-state">No training scheduled for today.</div>
          )}
        </div>

        <div className="dashboard-panel meal-panel">
          <div className="section-title">
            <h2>Meals scheduled</h2>
            <button onClick={() => setActiveTab('mealplan')}>Create meal</button>
          </div>
          <div className="event-list">
            {todayMeals.length ? (
              todayMeals.map((event) => (
                <button
                  key={event.id}
                  className="event-item"
                  onClick={() => openEventDetails(event)}
                >
                  <div>
                    <strong>{event.title || 'Meal'}</strong>
                    <span>{event.start_time || 'Anytime'}</span>
                  </div>
                  <span>{event.ref_recipe_id ? `Recipe ${event.ref_recipe_id}` : ''}</span>
                </button>
              ))
            ) : (
              <div className="empty-state">No meals scheduled for today.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
