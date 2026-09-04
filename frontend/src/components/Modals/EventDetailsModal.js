import React from 'react';
import { fetchJson } from '../../services/api';

export default function EventDetailsModal({
  selectedEvent,
  eventModalVisible,
  setSelectedEvent,
  openEventEdit,
  handleDeleteEvent,
  workouts,
  workoutExercises,
  exercises,
  loadEvents,
  fetchWorkoutExercises
}) {
  const [loggingMode, setLoggingMode] = React.useState(false);
  const [fastLogData, setFastLogData] = React.useState({});

  React.useEffect(() => {
    let active = true;
    const loadFastLogData = async () => {
      if (!selectedEvent?.ref_workout_id || !workoutExercises) return;
      
      // Eager fetch workout exercises if missing
      if (!workoutExercises[selectedEvent.ref_workout_id] && fetchWorkoutExercises) {
        await fetchWorkoutExercises(selectedEvent.ref_workout_id);
      }
      
      const wexs = workoutExercises[selectedEvent.ref_workout_id] || [];
      const initData = {};
      
      wexs.forEach(we => {
        initData[we.exercise_id] = {
          sets: we.sets || '',
          reps: we.reps || '',
          weight: we.weight || '',
          log_id: null
        };
      });

      if (selectedEvent.is_completed) {
        try {
          const logs = await fetchJson(`/logs/lifts?log_date=${selectedEvent.event_date}`);
          logs.forEach(log => {
            if (initData[log.exercise_id]) {
              initData[log.exercise_id] = {
                sets: log.sets || initData[log.exercise_id].sets,
                reps: log.reps || initData[log.exercise_id].reps,
                weight: log.weight || initData[log.exercise_id].weight,
                log_id: log.id
              };
            }
          });
        } catch (e) {
          console.error("Failed to fetch existing lift logs", e);
        }
      }

      if (active) {
        setFastLogData(initData);
      }
    };

    if (loggingMode) {
      loadFastLogData();
    }
    
    return () => { active = false; };
  }, [loggingMode, selectedEvent?.ref_workout_id, selectedEvent?.is_completed, selectedEvent?.event_date, workoutExercises, fetchWorkoutExercises]);

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
    for (const [exId, data] of Object.entries(fastLogData)) {
      if (data.weight) {
        if (data.log_id) {
          await fetchJson(`/logs/lifts/${data.log_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              weight: data.weight.toString(),
              sets: parseInt(data.sets) || null,
              reps: parseInt(data.reps) || null
            })
          });
        } else {
          await fetchJson('/logs/lifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exercise_id: parseInt(exId),
              weight: data.weight.toString(),
              sets: parseInt(data.sets) || null,
              reps: parseInt(data.reps) || null,
              log_date: selectedEvent.event_date
            })
          });
        }
      }
    }

    await fetchJson(`/calendar/${selectedEvent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...selectedEvent,
        category: selectedEvent.event_type,
        date: selectedEvent.event_date,
        is_completed: true
      })
    });

    setSelectedEvent(null);
    if (loadEvents) loadEvents();
  };

  if (!selectedEvent || eventModalVisible) return null;

  return (
    <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Event details</h3>
        <p>
          <strong>{selectedEvent.title}</strong>
        </p>
        <p>{selectedEvent.event_type}</p>
        <p>
          {selectedEvent.event_date} {selectedEvent.start_time || ''}
        </p>
        <p>Duration: {selectedEvent.duration_mins || '60'} min</p>
        <p>{selectedEvent.notes || 'No notes'}</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setSelectedEvent(null)}>
            Close
          </button>
          <button className="secondary-button" onClick={() => openEventEdit(selectedEvent)}>
            Edit
          </button>
          <button className="action-delete" onClick={() => handleDeleteEvent(selectedEvent.id)}>
            Delete
          </button>
        </div>

        {selectedEvent.event_type === 'Training' && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            {!loggingMode ? (
              <button 
                className="primary-button" 
                style={{ width: '100%', background: '#10b981', color: '#fff' }}
                onClick={() => setLoggingMode(true)}
              >
                {selectedEvent.is_completed ? 'View / Edit Logged Lifts' : '✓ Mark as Completed'}
              </button>
            ) : (
              <div className="fast-log-container">
                <h4 style={{ marginBottom: '10px' }}>Log Workout (leave empty to skip)</h4>
                {(workoutExercises?.[selectedEvent.ref_workout_id] || [])
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
