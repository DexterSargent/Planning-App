import React, { useState, useEffect, useMemo } from 'react';
import { Dumbbell, X } from 'lucide-react';
import { fetchJson } from '../../services/api';
import MuscleDiagram from '../Training/MuscleDiagram';

export default function WeeklyWorkoutPlannerModal({
  visible,
  onClose,
  weekDates = [],
  workouts = [],
  workoutExercises = {},
  events = [],
  refreshAll,
}) {
  const [selections, setSelections] = useState({});
  const [trainingEventsByDay, setTrainingEventsByDay] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Calculate muscle frequencies across all selected workouts
  const muscleFrequencies = useMemo(() => {
    const freqs = {};
    // Helper to capitalize first letter to match MuscleDiagram keys (e.g., 'Chest', 'Shoulders')
    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
    for (const day of weekDates) {
      const daySelections = selections[day.date] || {};
      for (const eventId in daySelections) {
        const workoutId = daySelections[eventId];
        if (workoutId) {
          const exercises = workoutExercises[workoutId] || [];
          exercises.forEach((ex) => {
            if (ex.category) {
              const setsCount = Number(ex.sets) || 1;
              const lower = ex.category.toLowerCase();
              if (lower.includes('chest')) freqs['Chest'] = (freqs['Chest'] || 0) + setsCount;
              if (lower.includes('back') || lower.includes('lats') || lower.includes('traps')) freqs['Back'] = (freqs['Back'] || 0) + setsCount;
              if (lower.includes('shoulders') || lower.includes('delt')) freqs['Shoulders'] = (freqs['Shoulders'] || 0) + setsCount;
              if (lower.includes('biceps')) freqs['Biceps'] = (freqs['Biceps'] || 0) + setsCount;
              if (lower.includes('triceps')) freqs['Triceps'] = (freqs['Triceps'] || 0) + setsCount;
              if (lower.includes('quads') || lower.includes('thighs') || lower.includes('leg')) freqs['Quads'] = (freqs['Quads'] || 0) + setsCount;
              if (lower.includes('hamstrings')) freqs['Hamstrings'] = (freqs['Hamstrings'] || 0) + setsCount;
              if (lower.includes('glutes')) freqs['Glutes'] = (freqs['Glutes'] || 0) + setsCount;
              if (lower.includes('calves')) freqs['Calves'] = (freqs['Calves'] || 0) + setsCount;
              if (lower.includes('core') || lower.includes('abs')) freqs['Core'] = (freqs['Core'] || 0) + setsCount;
            }
          });
        }
      }
    }
    return freqs;
  }, [selections, weekDates, workoutExercises]);

  useEffect(() => {
    if (!visible || !weekDates.length) return;
    const initial = {};
    const eventsMap = {};

    weekDates.forEach((day) => {
      initial[day.date] = {};
      const dayTrainings = events
        .filter((ev) => ev.event_date === day.date && ev.event_type?.toLowerCase() === 'training')
        .sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));
      
      eventsMap[day.date] = dayTrainings;
      
      dayTrainings.forEach((ev) => {
        initial[day.date][ev.id] = ev.ref_workout_id ? String(ev.ref_workout_id) : '';
      });
    });

    setTrainingEventsByDay(eventsMap);
    setSelections(initial);
    setStatusMsg('');
  }, [visible, weekDates, events]);

  if (!visible) return null;

  const handleSelectChange = (date, eventId, workoutId) => {
    setSelections((prev) => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [eventId]: workoutId,
      },
    }));
  };

  const handleApplyWorkoutPlan = async () => {
    setSaving(true);
    setStatusMsg('');
    try {
      for (const day of weekDates) {
        const daySelections = selections[day.date] || {};
        const dayTrainings = trainingEventsByDay[day.date] || [];
        
        for (const ev of dayTrainings) {
          const workoutId = daySelections[ev.id];
          const currentRef = ev.ref_workout_id ? String(ev.ref_workout_id) : '';
          
          if (workoutId === currentRef) continue;

          const selectedWorkout = workoutId ? workouts.find(w => w.id === Number(workoutId)) : null;
          const newTitle = selectedWorkout ? selectedWorkout.name : (ev.title || 'Training');

          await fetchJson(`/calendar/${ev.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: newTitle,
              event_date: ev.event_date,
              start_time: ev.start_time,
              duration_mins: ev.duration_mins,
              event_type: 'Training',
              ref_workout_id: workoutId ? Number(workoutId) : null,
              notes: ev.notes,
              location_type: ev.location_type,
            }),
          });
        }
      }

      await refreshAll();
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
      setStatusMsg(err.message || 'Error applying workout plan');
    }
  };

  const totalTrainingEvents = Object.values(trainingEventsByDay).flat().length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Dumbbell size={24} /> Plan Workouts for This Week</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              Assign workouts to your scheduled Training blocks and see your weekly muscle volume.
            </p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>

        {statusMsg && <div style={{ color: 'var(--danger)', marginBottom: '12px' }}>{statusMsg}</div>}

        {totalTrainingEvents === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)' }}>
            <h3 style={{ marginBottom: '8px' }}>No training sessions scheduled</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Add some "Training" events to your calendar or use a Weekly Template first!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', background: 'var(--panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', textAlign: 'center' }}>Total Muscle Volume</h3>
              <div style={{ width: '100%', height: '350px' }}>
                <MuscleDiagram muscleFrequencies={muscleFrequencies} />
              </div>
            </div>

            <div style={{ flex: '2 1 400px', display: 'grid', gap: '12px', alignContent: 'start' }}>
              {weekDates.map((day) => {
                const dayTrainings = trainingEventsByDay[day.date] || [];
                if (dayTrainings.length === 0) return null;

                return (
                  <div
                    key={day.date}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr',
                      gap: '12px',
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>{day.weekday}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{day.label}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      {dayTrainings.map((ev) => {
                        const val = (selections[day.date] || {})[ev.id] || '';
                        return (
                          <div key={ev.id}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginBottom: '2px' }}>
                              {ev.title || 'Workout'} ({ev.start_time})
                            </label>
                            <select
                              value={val}
                              onChange={(e) => handleSelectChange(day.date, ev.id, e.target.value)}
                              style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '0.85rem' }}
                            >
                              <option value="">-- Unassigned --</option>
                              {workouts.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={handleApplyWorkoutPlan} disabled={saving || totalTrainingEvents === 0}>
            {saving ? 'Saving...' : <><Dumbbell size={18} className="inline-icon" /> Save Workout Plan</>}
          </button>
        </div>
      </div>
    </div>
  );
}
