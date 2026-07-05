import React from 'react';

export default function EventModal({
  eventModalVisible,
  setEventModalVisible,
  scheduleForm,
  handleEventFormChange,
  eventTypeOptions,
  workouts,
  getSelectedWorkoutDuration,
  recipes,
  getSelectedRecipeDuration,
  handleSaveEvent,
}) {
  if (!eventModalVisible) return null;

  return (
    <div className="modal-overlay" onClick={() => setEventModalVisible(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Add calendar event</h3>
        <label>Category</label>
        <select name="category" value={scheduleForm.category} onChange={handleEventFormChange}>
          {eventTypeOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <label>Date</label>
        <input type="date" name="date" value={scheduleForm.date} onChange={handleEventFormChange} />
        <label>Start time</label>
        <input
          type="time"
          name="start_time"
          value={scheduleForm.start_time}
          onChange={handleEventFormChange}
        />
        {scheduleForm.category === 'Work' && (
          <>
            <label>Duration (mins)</label>
            <input
              type="number"
              name="duration_mins"
              value={scheduleForm.duration_mins}
              onChange={handleEventFormChange}
              placeholder="60"
            />
          </>
        )}
        {scheduleForm.category === 'Training' && (
          <>
            <label>Workout</label>
            <select
              name="ref_workout_id"
              value={scheduleForm.ref_workout_id}
              onChange={handleEventFormChange}
            >
              <option value="">Choose workout</option>
              {workouts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <label>Duration</label>
            <input
              type="text"
              value={`${getSelectedWorkoutDuration() || 'Auto'}`}
              disabled
            />
          </>
        )}
        {scheduleForm.category === 'Meal' && (
          <>
            <label>Recipe</label>
            <select
              name="ref_recipe_id"
              value={scheduleForm.ref_recipe_id}
              onChange={handleEventFormChange}
            >
              <option value="">Choose recipe</option>
              {recipes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <label>Duration</label>
            <input
              type="text"
              value={`${getSelectedRecipeDuration() || 'Auto'}`}
              disabled
            />
          </>
        )}
        {scheduleForm.category === 'Commute' && (
          <>
            <label>Duration (mins)</label>
            <input
              type="number"
              name="duration_mins"
              value={scheduleForm.duration_mins}
              onChange={handleEventFormChange}
              placeholder="30"
            />
          </>
        )}
        {scheduleForm.category === 'Social' && (
          <>
            <label>Minimum duration (mins)</label>
            <input
              type="number"
              name="min_duration"
              value={scheduleForm.min_duration}
              onChange={handleEventFormChange}
              placeholder="30"
            />
            <label>Maximum duration (mins)</label>
            <input
              type="number"
              name="max_duration"
              value={scheduleForm.max_duration}
              onChange={handleEventFormChange}
              placeholder="90"
            />
          </>
        )}
        <label>Notes</label>
        <textarea
          name="notes"
          value={scheduleForm.notes}
          onChange={handleEventFormChange}
          rows={3}
        />
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setEventModalVisible(false)}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSaveEvent}>
            Save event
          </button>
        </div>
      </div>
    </div>
  );
}
