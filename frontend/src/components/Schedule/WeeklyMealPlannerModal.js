import React, { useState, useEffect, useMemo } from 'react';
import { Utensils, Zap, X } from 'lucide-react';
import { fetchJson } from '../../services/api';

export default function WeeklyMealPlannerModal({
  visible,
  onClose,
  weekDates = [],
  recipes = [],
  events = [],
  refreshAll,
}) {
  const [selections, setSelections] = useState({});
  const [mealEventsByDay, setMealEventsByDay] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const uniqueMealTitles = useMemo(() => {
    const titles = new Set();
    Object.values(mealEventsByDay).flat().forEach((ev) => {
      if (ev.title) titles.add(ev.title);
    });
    return Array.from(titles);
  }, [mealEventsByDay]);

  useEffect(() => {
    if (!visible || !weekDates.length) return;
    const initial = {};
    const eventsMap = {};

    weekDates.forEach((day) => {
      initial[day.date] = {};
      const dayMeals = events
        .filter((ev) => ev.event_date === day.date && ev.event_type?.toLowerCase() === 'meal')
        .sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));
      
      eventsMap[day.date] = dayMeals;
      
      dayMeals.forEach((ev) => {
        initial[day.date][ev.id] = ev.ref_recipe_id ? String(ev.ref_recipe_id) : '';
      });
    });

    setMealEventsByDay(eventsMap);
    setSelections(initial);
    setStatusMsg('');
  }, [visible, weekDates, events]);

  if (!visible) return null;

  const handleSelectChange = (date, eventId, recipeId) => {
    setSelections((prev) => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [eventId]: recipeId,
      },
    }));
  };

  const handleQuickAssignAll = (title, recipeId) => {
    setSelections((prev) => {
      const updated = { ...prev };
      weekDates.forEach((day) => {
        const dayMeals = mealEventsByDay[day.date] || [];
        dayMeals.forEach((ev) => {
          if (ev.title === title) {
            updated[day.date] = {
              ...(updated[day.date] || {}),
              [ev.id]: recipeId,
            };
          }
        });
      });
      return updated;
    });
  };

  const handleApplyMealPlan = async () => {
    setSaving(true);
    setStatusMsg('');
    try {
      let updatedCount = 0;

      for (const day of weekDates) {
        const daySelections = selections[day.date] || {};
        const dayMeals = mealEventsByDay[day.date] || [];
        
        for (const ev of dayMeals) {
          const recipeId = daySelections[ev.id];
          const currentRef = ev.ref_recipe_id ? String(ev.ref_recipe_id) : '';
          
          if (recipeId === currentRef) continue;

          await fetchJson(`/calendar/${ev.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: ev.title,
              event_date: ev.event_date,
              start_time: ev.start_time,
              duration_mins: ev.duration_mins,
              event_type: 'Meal',
              ref_recipe_id: recipeId ? Number(recipeId) : null,
              notes: ev.notes,
              location_type: ev.location_type,
            }),
          });
          updatedCount++;
        }
      }

      await refreshAll();
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
      setStatusMsg(err.message || 'Error applying meal plan');
    }
  };

  const totalMealEvents = Object.values(mealEventsByDay).flat().length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Utensils size={24} /> Plan Meals for This Week</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              Assign recipes to the Meal events already scheduled on your calendar this week.
            </p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>

        {statusMsg && <div style={{ color: 'var(--danger)', marginBottom: '12px' }}>{statusMsg}</div>}

        {totalMealEvents === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)' }}>
            <h3 style={{ marginBottom: '8px' }}>No meals scheduled this week</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Add some "Meal" events to your calendar or use a Weekly Template to autopopulate them first!
            </p>
          </div>
        ) : (
          <>
            {uniqueMealTitles.length > 0 && (
              <div style={{ background: 'var(--panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><Zap size={16} className="inline-icon" /> Quick Fill Across All Days</strong>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {uniqueMealTitles.map((title) => (
                    <div key={`quick-${title}`} style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Set all {title}s to:</label>
                      <select
                        onChange={(e) => handleQuickAssignAll(title, e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', marginTop: '4px' }}
                        defaultValue=""
                      >
                        <option value="">-- Quick fill {title} --</option>
                        {recipes.filter(r => {
                          if (!r.meal_type || !title || title.toLowerCase() === 'meal') return true;
                          const rTypes = r.meal_type.toLowerCase();
                          const t = title.toLowerCase();
                          return rTypes.includes(t) || 
                                 (t === 'dinner' && rTypes.includes('supper')) || 
                                 (t === 'supper' && rTypes.includes('dinner'));
                        }).map((r) => (
                          <option key={`quick-${title}-${r.id}`} value={r.id}>{r.name} ({r.total_kcal} kcal)</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              {weekDates.map((day) => {
                const dayMeals = mealEventsByDay[day.date] || [];
                if (dayMeals.length === 0) return null;

                return (
                  <div
                    key={day.date}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr',
                      gap: '12px',
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>{day.weekday}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{day.label}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      {dayMeals.map((ev) => {
                        const val = (selections[day.date] || {})[ev.id] || '';
                        return (
                          <div key={ev.id}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginBottom: '2px' }}>
                              {ev.title} ({ev.start_time})
                            </label>
                            <select
                              value={val}
                              onChange={(e) => handleSelectChange(day.date, ev.id, e.target.value)}
                              style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '0.85rem' }}
                            >
                              <option value="">-- No Recipe --</option>
                              {recipes.filter(r => {
                                if (!r.meal_type || !ev.title || ev.title.toLowerCase() === 'meal') return true;
                                const rTypes = r.meal_type.toLowerCase();
                                const t = ev.title.toLowerCase();
                                return rTypes.includes(t) || 
                                       (t === 'dinner' && rTypes.includes('supper')) || 
                                       (t === 'supper' && rTypes.includes('dinner'));
                              }).map((r) => (
                                <option key={r.id} value={r.id}>{r.name} {r.meal_type ? `[${r.meal_type}]` : ''}</option>
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

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={handleApplyMealPlan} disabled={saving}>
                {saving ? 'Saving...' : <><Utensils size={18} className="inline-icon" /> Save Meal Plan</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
