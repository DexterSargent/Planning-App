import React, { useState } from 'react';
import { fetchJson } from '../../services/api';
import { ChevronDown, ChevronRight, Edit2, Trash2, Save, X } from 'lucide-react';

export default function WorkoutLogs({ events, exercises }) {
  const [expandedLog, setExpandedLog] = useState(null);
  const [liftLogs, setLiftLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editForm, setEditForm] = useState({ weight: '', sets: '', reps: '' });

  const completedWorkouts = (events || [])
    .filter(e => e.is_completed && e.event_type?.startsWith('Training'))
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const toggleExpand = async (eventId, date) => {
    if (expandedLog === eventId) {
      setExpandedLog(null);
      setLiftLogs([]);
      return;
    }
    setExpandedLog(eventId);
    setLoading(true);
    setLiftLogs([]);
    setEditingLogId(null);
    try {
      const logs = await fetchJson(`/logs/lifts?log_date=${date}`);
      setLiftLogs(logs || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const startEdit = (log) => {
    setEditingLogId(log.id);
    setEditForm({ weight: log.weight, sets: log.sets || '', reps: log.reps || '' });
  };

  const cancelEdit = () => {
    setEditingLogId(null);
  };

  const saveEdit = async (logId) => {
    try {
      await fetchJson(`/logs/lifts/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: editForm.weight,
          sets: parseInt(editForm.sets) || null,
          reps: parseInt(editForm.reps) || null
        })
      });
      setLiftLogs(prev => prev.map(l => l.id === logId ? { ...l, ...editForm } : l));
      setEditingLogId(null);
    } catch (e) {
      console.error(e);
      alert('Failed to save log');
    }
  };

  const deleteLog = async (logId) => {
    if (!window.confirm('Delete this logged exercise?')) return;
    try {
      await fetchJson(`/logs/lifts/${logId}`, { method: 'DELETE' });
      setLiftLogs(prev => prev.filter(l => l.id !== logId));
    } catch (e) {
      console.error(e);
      alert('Failed to delete log');
    }
  };

  return (
    <div className="workout-logs-container" style={{ padding: '20px' }}>
      <h3>Completed Workouts</h3>
      {completedWorkouts.length === 0 && <p className="empty-state">No completed workouts found.</p>}
      
      <div className="logs-list">
        {completedWorkouts.map(event => (
          <div key={event.id} className="card compact-card" style={{ marginBottom: '10px' }}>
            <div 
              className="card-heading" 
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => toggleExpand(event.id, event.event_date)}
            >
              <div>
                <strong>{event.title || 'Workout'}</strong>
                <span>{event.event_date}</span>
              </div>
              <div>
                {expandedLog === event.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </div>
            
            {expandedLog === event.id && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                {loading ? <p>Loading logs...</p> : (
                  liftLogs.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '8px 4px' }}>Exercise</th>
                          <th style={{ padding: '8px 4px' }}>Weight</th>
                          <th style={{ padding: '8px 4px' }}>Sets</th>
                          <th style={{ padding: '8px 4px' }}>Reps</th>
                          <th style={{ padding: '8px 4px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liftLogs.map(log => {
                          const exName = exercises.find(e => e.id === log.exercise_id)?.name || 'Unknown Exercise';
                          const isEditing = editingLogId === log.id;
                          return (
                            <tr key={log.id} style={{ borderBottom: '1px solid var(--background)' }}>
                              <td style={{ padding: '8px 4px' }}>{exName}</td>
                              <td style={{ padding: '8px 4px' }}>
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={editForm.weight} 
                                    onChange={e => setEditForm({...editForm, weight: e.target.value})}
                                    style={{ width: '60px' }}
                                  />
                                ) : log.weight}
                              </td>
                              <td style={{ padding: '8px 4px' }}>
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    value={editForm.sets} 
                                    onChange={e => setEditForm({...editForm, sets: e.target.value})}
                                    style={{ width: '40px' }}
                                  />
                                ) : (log.sets || '-')}
                              </td>
                              <td style={{ padding: '8px 4px' }}>
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    value={editForm.reps} 
                                    onChange={e => setEditForm({...editForm, reps: e.target.value})}
                                    style={{ width: '40px' }}
                                  />
                                ) : (log.reps || '-')}
                              </td>
                              <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                                {isEditing ? (
                                  <>
                                    <button onClick={() => saveEdit(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', marginRight: '5px' }}><Save size={16} /></button>
                                    <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={16} /></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => startEdit(log)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', marginRight: '5px' }}><Edit2 size={16} /></button>
                                    <button onClick={() => deleteLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="empty-state">No specific exercises logged for this date.</p>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
