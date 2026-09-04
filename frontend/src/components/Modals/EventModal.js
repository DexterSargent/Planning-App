import React from 'react';
import { fetchJson } from '../../services/api';

export default function EventModal({
  eventModalVisible,
  setEventModalVisible,
  scheduleForm,
  setScheduleForm,
  handleEventFormChange,
  eventTypeOptions,
  workouts,
  getSelectedWorkoutDuration,
  recipes,
  getSelectedRecipeDuration,
  handleSaveEvent,
  userSettings,
  exercises,
  workoutExercises,
  loadEvents,
}) {
  const [workoutSearch, setWorkoutSearch] = React.useState('');
  const [recipeSearch, setRecipeSearch] = React.useState('');
  const [loggingMode, setLoggingMode] = React.useState(false);
  const [fastLogData, setFastLogData] = React.useState({});

  React.useEffect(() => {
    if (loggingMode && scheduleForm.ref_workout_id && workoutExercises) {
      const wexs = workoutExercises[scheduleForm.ref_workout_id] || [];
      const initData = {};
      wexs.forEach(we => {
        initData[we.exercise_id] = {
          sets: we.sets || '',
          reps: we.reps || '',
          weight: we.weight || ''
        };
      });
      setFastLogData(initData);
    }
  }, [loggingMode, scheduleForm.ref_workout_id, workoutExercises]);

  const handleFastLogChange = (exerciseId, field, value) => {
    setFastLogData(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value
      }
    }));
  };

  const handleCompleteAndLog = async () => {
    // 1. Log each exercise
    for (const [exId, data] of Object.entries(fastLogData)) {
      if (data.weight) {
        await fetchJson('/logs/lifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_id: parseInt(exId),
            weight: data.weight.toString(),
            sets: parseInt(data.sets) || null,
            reps: parseInt(data.reps) || null,
            log_date: scheduleForm.date
          })
        });
      }
    }

    // 2. Mark event as completed — map scheduleForm fields to API field names
    await fetchJson(`/calendar/${scheduleForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: scheduleForm.title || scheduleForm.category || 'Event',
        event_type: scheduleForm.category,
        event_date: scheduleForm.date,
        start_time: scheduleForm.start_time || undefined,
        duration_mins: Number(scheduleForm.duration_mins) || undefined,
        ref_workout_id: scheduleForm.ref_workout_id ? Number(scheduleForm.ref_workout_id) : undefined,
        ref_recipe_id: scheduleForm.ref_recipe_id ? Number(scheduleForm.ref_recipe_id) : undefined,
        notes: scheduleForm.notes || undefined,
        location_type: scheduleForm.location || undefined,
        is_completed: true,
      })
    });

    // 3. Close modal and reload
    setEventModalVisible(false);
    if (loadEvents) loadEvents();
  };

  if (!eventModalVisible) return null;

  const filteredWorkouts = workouts.filter((item) =>
    !workoutSearch || item.name.toLowerCase().includes(workoutSearch.toLowerCase())
  );
  const filteredRecipes = recipes.filter((item) =>
    !recipeSearch || item.name.toLowerCase().includes(recipeSearch.toLowerCase()) || (item.meal_type && item.meal_type.toLowerCase().includes(recipeSearch.toLowerCase()))
  );

  let customLocs = [];
  try {
    customLocs = JSON.parse(userSettings?.custom_locations || '[]');
  } catch (e) {
    customLocs = [];
  }

  const handleSelectFrequentLocation = (e) => {
    const val = e.target.value;
    if (!val) return;
    let locText = '';
    let mins = Number(userSettings?.default_commute_mins) || 20;

    if (val === 'Gym') {
      locText = userSettings?.gym_address || 'Gym';
      mins = Number(userSettings?.gym_commute_mins) || 20;
    } else if (val === 'Work') {
      locText = userSettings?.work_address || 'Work';
      mins = Number(userSettings?.work_commute_mins) || 25;
    } else if (val === 'Field') {
      locText = userSettings?.field_address || 'Field';
      mins = Number(userSettings?.field_commute_mins) || 30;
    } else if (val === 'Home') {
      locText = userSettings?.home_address || 'Home';
      mins = 0;
    } else {
      const found = customLocs.find((c) => String(c.id) === val);
      if (found) {
        locText = found.address || found.name;
        mins = Number(found.mins) || 15;
      }
    }

    if (setScheduleForm) {
      setScheduleForm((prev) => ({
        ...prev,
        location: locText,
        commute_to_mins: mins,
        commute_from_mins: mins,
        commute_mode: mins === 0 ? 'none' : (prev.commute_mode || 'walk'),
      }));
    } else {
      handleEventFormChange({ target: { name: 'location', value: locText } });
      handleEventFormChange({ target: { name: 'commute_to_mins', value: mins } });
      handleEventFormChange({ target: { name: 'commute_from_mins', value: mins } });
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setEventModalVisible(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>Add/Edit calendar event</h3>
        {scheduleForm.category === 'Social' && (
          <>
            <label>Title / Description</label>
            <input
              type="text"
              name="title"
              value={scheduleForm.title || ''}
              onChange={handleEventFormChange}
              placeholder="e.g. Team Standup, Leg Day, Dinner..."
            />
          </>
        )}
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
            <div style={{ marginBottom: '6px' }}>
              <input
                type="text"
                placeholder="🔍 Search workouts by title..."
                value={workoutSearch}
                onChange={(e) => setWorkoutSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
              />
            </div>
            <select
              name="ref_workout_id"
              value={scheduleForm.ref_workout_id}
              onChange={handleEventFormChange}
            >
              <option value="">Choose workout ({filteredWorkouts.length} matching options)</option>
              {filteredWorkouts.map((item) => (
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
            <div>
              <label style={{ display: 'block', marginBottom: '4px' }}>Meal Slot</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {['Breakfast', 'Lunch', 'Supper', 'Snack'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setScheduleForm({ ...scheduleForm, title: m })}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '6px',
                      border: scheduleForm.title === m ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: scheduleForm.title === m ? 'var(--primary)' : 'var(--input-bg)',
                      color: scheduleForm.title === m ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <label>Recipe</label>
            <div style={{ marginBottom: '6px' }}>
              <input
                type="text"
                placeholder="🔍 Search recipes by title or meal type..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
              />
            </div>
            <select
              name="ref_recipe_id"
              value={scheduleForm.ref_recipe_id || ""}
              onChange={handleEventFormChange}
            >
              <option value="">-- No Recipe Selected (Optional) --</option>
              {filteredRecipes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.meal_type ? `[${item.meal_type}]` : ''}
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
            <label>Notes</label>
            <textarea
              name="notes"
              value={scheduleForm.notes}
              onChange={handleEventFormChange}
              rows={3}
            />
          </>
        )}
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setEventModalVisible(false)}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSaveEvent}>
            Save event
          </button>
        </div>

        {scheduleForm.id && scheduleForm.category === 'Training' && !scheduleForm.is_completed && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            {!loggingMode ? (
              <button 
                className="primary-button" 
                style={{ width: '100%', background: '#10b981', color: '#fff' }}
                onClick={() => setLoggingMode(true)}
              >
                ✓ Mark as Completed & Log
              </button>
            ) : (
              <div className="fast-log-container">
                <h4 style={{ marginBottom: '10px' }}>Log Workout</h4>
                {(workoutExercises[scheduleForm.ref_workout_id] || [])
                  .map((we) => {
                    const ex = exercises?.find((e) => e.id === we.exercise_id);
                    return (
                      <div key={we.exercise_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ flex: 1, fontSize: '0.9rem' }}>{ex?.name}</div>
                        <input
                          type="number"
                          placeholder="Sets"
                          value={fastLogData[we.exercise_id]?.sets || ''}
                          onChange={(e) => handleFastLogChange(we.exercise_id, 'sets', e.target.value)}
                          style={{ width: '60px', padding: '4px' }}
                        />
                        <input
                          type="number"
                          placeholder="Reps"
                          value={fastLogData[we.exercise_id]?.reps || ''}
                          onChange={(e) => handleFastLogChange(we.exercise_id, 'reps', e.target.value)}
                          style={{ width: '60px', padding: '4px' }}
                        />
                        <input
                          type="text"
                          placeholder="Weight"
                          value={fastLogData[we.exercise_id]?.weight || ''}
                          onChange={(e) => handleFastLogChange(we.exercise_id, 'weight', e.target.value)}
                          style={{ width: '80px', padding: '4px' }}
                        />
                      </div>
                    );
                  })}
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button className="secondary-button" style={{ flex: 1 }} onClick={() => setLoggingMode(false)}>
                    Cancel
                  </button>
                  <button className="primary-button" style={{ flex: 1, background: '#10b981', color: '#fff' }} onClick={handleCompleteAndLog}>
                    Save & Complete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
