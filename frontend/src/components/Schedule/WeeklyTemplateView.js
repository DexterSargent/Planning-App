import React, { useState, useMemo } from 'react';
import { CalendarDays, Zap, Search } from 'lucide-react';
import { fetchJson } from '../../services/api';

const DAYS_OF_WEEK = [
  { id: 'Monday', label: 'Mon' },
  { id: 'Tuesday', label: 'Tue' },
  { id: 'Wednesday', label: 'Wed' },
  { id: 'Thursday', label: 'Thu' },
  { id: 'Friday', label: 'Fri' },
  { id: 'Saturday', label: 'Sat' },
  { id: 'Sunday', label: 'Sun' },
];

export default function WeeklyTemplateView({
  weeklyTemplate = [],
  fetchWeeklyTemplate,
  eventColors = {},
  workouts = [],
  userSettings = {},
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [workoutSearch, setWorkoutSearch] = useState('');
  const [form, setForm] = useState({
    day_of_week: 'Monday',
    event_type: 'Work',
    title: '',
    start_time: '09:00',
    duration_mins: 60,
    ref_workout_id: '',
    location: '',
    location_type: '',
    commute_to_mins: '',
    commute_from_mins: '',
  });
  const [statusMsg, setStatusMsg] = useState('');

  const filteredWorkouts = workouts.filter((w) =>
    w?.name?.toLowerCase().includes((workoutSearch || '').toLowerCase())
  );

  let customLocs = [];
  try {
    if (userSettings?.custom_locations) {
      customLocs = JSON.parse(userSettings.custom_locations);
    }
  } catch (e) { }

  const handleOpenAdd = (dayId = 'Monday', defaultTime = '09:00') => {
    setForm({
      day_of_week: dayId,
      event_type: 'Work',
      title: '',
      start_time: defaultTime,
      duration_mins: 60,
      ref_workout_id: '',
      location: '',
      location_type: '',
      commute_to_mins: '',
      commute_from_mins: '',
    });
    setWorkoutSearch('');
    setModalOpen(true);
  };

  const handleSaveBlock = async (e) => {
    e.preventDefault();
    if (!form.title.trim() && form.event_type === 'Social') {
      setStatusMsg('Please enter a title for this Social event.');
      return;
    }
    const finalTitle = form.title.trim() || (form.event_type === 'meal' ? 'Meal' : form.event_type);
    try {
      await fetchJson('/schedule/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          duration_mins: Number(form.duration_mins) || 60,
          event_type: form.event_type,
          title: finalTitle,
          ref_workout_id: form.ref_workout_id ? Number(form.ref_workout_id) : null,
          location: form.location,
          location_type: form.location_type,
          commute_to_mins: form.commute_to_mins ? Number(form.commute_to_mins) : null,
          commute_from_mins: form.commute_from_mins ? Number(form.commute_from_mins) : null,
        }),
      });
      await fetchWeeklyTemplate();
      setModalOpen(false);
      setStatusMsg('');
    } catch (err) {
      setStatusMsg(err.message || 'Error saving template block');
    }
  };

  const handleDeleteBlock = async (blockId) => {
    try {
      await fetchJson(`/schedule/template/${blockId}`, { method: 'DELETE' });
      await fetchWeeklyTemplate();
    } catch (err) {
      console.error('Error deleting block:', err);
    }
  };

  return (
    <div className="weekly-template-container" style={{ padding: '16px', background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarDays size={20} /> Default Weekly Schedule Template</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>
            Set recurring weekly blocks and designated meal slots here. Use <strong><Zap size={14} className="inline-icon" /> Autopopulate Week</strong> in the Week view to fill your schedule automatically!
          </p>
        </div>
        <button className="primary-button" onClick={() => handleOpenAdd('Monday', '09:00')}>
          ＋ Add Template Block
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
        {DAYS_OF_WEEK.map((day) => {
          const dayBlocks = (weeklyTemplate || []).filter((b) => b.day_of_week === day.id);
          dayBlocks.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

          return (
            <div
              key={day.id}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px',
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px' }}>
                <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>{day.label}</strong>
                <button
                  onClick={() => handleOpenAdd(day.id, '12:00')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
                  title="Add block to this day"
                >
                  ＋
                </button>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dayBlocks.length === 0 ? (
                  <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', textAlign: 'center', margin: 'auto 0' }}>
                    No recurring blocks
                  </div>
                ) : (
                  dayBlocks.map((block) => {
                    const color = eventColors[block.event_type] || 'var(--accent)';
                    return (
                      <div
                        key={block.id}
                        style={{
                          background: color,
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          position: 'relative',
                          fontSize: '0.85rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '0.9rem' }}>{block.title}</strong>
                          <button
                            onClick={() => handleDeleteBlock(block.id)}
                            style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '1px 5px', fontSize: '0.75rem' }}
                            title="Remove block"
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.9 }}>
                          🕒 {block.start_time} ({block.duration_mins} mins)
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Default Template Block</h2>
              <button className="icon-button" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            {statusMsg && <div style={{ color: 'var(--danger)', marginBottom: '8px', fontSize: '0.9rem' }}>{statusMsg}</div>}
            <form onSubmit={handleSaveBlock} className="form-grid">
              <label>Day of Week</label>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>

              <label>Block Type</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
                <option value="Work">Work</option>
                <option value="Training">Training</option>
                <option value="Meal">Meal</option>
                <option value="Commute">Commute</option>
                <option value="Social">Social</option>
              </select>

              {form.event_type === 'Meal' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px' }}>Meal Slot</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Breakfast', 'Lunch', 'Supper'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForm({ ...form, title: m })}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '6px',
                          border: form.title === m ? '2px solid var(--primary)' : '1px solid var(--border)',
                          background: form.title === m ? 'var(--primary)' : 'var(--input-bg)',
                          color: form.title === m ? '#fff' : 'var(--text)',
                          cursor: 'pointer',
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.event_type === 'Social' && (
                <>
                  <label>Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Dinner with Friends"
                    required
                  />
                </>
              )}

              <label>Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />

              <label>Duration (minutes)</label>
              <input
                type="number"
                min="15"
                step="15"
                value={form.duration_mins}
                onChange={(e) => setForm({ ...form, duration_mins: e.target.value })}
                required
              />

              {form.event_type === 'Training' && (
                <>
                  <label>Workout</label>
                  <div style={{ marginBottom: '6px' }}>
                    <input
                      type="text"
                      placeholder="Search workouts by title..."
                      value={workoutSearch}
                      onChange={(e) => setWorkoutSearch(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                    />
                  </div>
                  <select
                    value={form.ref_workout_id}
                    onChange={(e) => setForm({ ...form, ref_workout_id: e.target.value })}
                  >
                    <option value="">Choose workout ({filteredWorkouts.length} matching options)</option>
                    {filteredWorkouts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </>
              )}



              <div className="modal-actions" style={{ marginTop: '16px', gridColumn: '1 / -1' }}>
                <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button">Save to Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
