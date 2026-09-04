import React, { useState, useEffect } from 'react';
import MuscleDiagram from './MuscleDiagram';

export default function Training({
  trainingTab,
  setTrainingTab,
  workoutForm,
  setWorkoutForm,
  handleExerciseModalOpen,
  exercises,
  addWorkoutExercise,
  removeWorkoutExercise,
  saveWorkout,
  workouts,
  editWorkout,
  deleteWorkout,
  exerciseLibrarySearch,
  setExerciseLibrarySearch,
  filteredExercises,
  openExerciseEdit,
  handleDeleteExercise,
}) {
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [workoutExerciseSearch, setWorkoutExerciseSearch] = useState('');

  // Discard changes if user switches tabs away from builder while editing
  useEffect(() => {
    if (trainingTab !== 'build' && workoutForm.id) {
      setWorkoutForm({ id: null, name: '', duration_mins: '', exercise_id: '', sets: '', reps: '', percent: '', weight_mode: 'percent', items: [] });
    }
  }, [trainingTab, workoutForm.id, setWorkoutForm]);

  const handleSelectMuscle = (muscleKey) => {
    if (!muscleKey) {
      setSelectedMuscles([]);
      return;
    }
    setSelectedMuscles((prev) =>
      prev.includes(muscleKey)
        ? prev.filter((m) => m !== muscleKey)
        : [...prev, muscleKey]
    );
  };

  const diagramFilteredExercises = exercises.filter((ex) => {
    const matchesSearch = !workoutExerciseSearch || (ex.name && ex.name.toLowerCase().includes(workoutExerciseSearch.toLowerCase())) || (ex.category && ex.category.toLowerCase().includes(workoutExerciseSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (!selectedMuscles || selectedMuscles.length === 0) return true;
    const cat = (ex.category || '').toLowerCase();
    return selectedMuscles.some((sel) => {
      const s = sel.toLowerCase();
      return cat.includes(s) || (s.includes('back') && (cat.includes('lats') || cat.includes('traps') || cat.includes('erector'))) || (s.includes('core') && (cat.includes('abs') || cat.includes('obliques')));
    });
  });

  const liveMuscleCounts = {};
  const currentItems = workoutForm && (Array.isArray(workoutForm.items) && workoutForm.items.length > 0 ? workoutForm.items : Array.isArray(workoutForm.exercise_list) ? workoutForm.exercise_list : []);
  if (Array.isArray(currentItems)) {
    currentItems.forEach((item) => {
      const ex = exercises.find((e) => e.id === Number(item.exercise_id) || e.name === item.name);
      if (ex && ex.category) {
        const setsCount = Number(item.sets) || 1;
        const categories = ex.category.split(',').map((c) => c.trim()).filter(Boolean);
        categories.forEach((cat) => {
          liveMuscleCounts[cat] = (liveMuscleCounts[cat] || 0);
        });
        const lower = ex.category.toLowerCase();
        if (lower.includes('chest')) liveMuscleCounts['Chest'] = (liveMuscleCounts['Chest'] || 0) + setsCount;
        if (lower.includes('back') || lower.includes('lats') || lower.includes('traps')) liveMuscleCounts['Back'] = (liveMuscleCounts['Back'] || 0) + setsCount;
        if (lower.includes('shoulders') || lower.includes('delt')) liveMuscleCounts['Shoulders'] = (liveMuscleCounts['Shoulders'] || 0) + setsCount;
        if (lower.includes('biceps')) liveMuscleCounts['Biceps'] = (liveMuscleCounts['Biceps'] || 0) + setsCount;
        if (lower.includes('triceps')) liveMuscleCounts['Triceps'] = (liveMuscleCounts['Triceps'] || 0) + setsCount;
        if (lower.includes('quads') || lower.includes('thighs') || lower.includes('leg')) liveMuscleCounts['Quads'] = (liveMuscleCounts['Quads'] || 0) + setsCount;
        if (lower.includes('hamstrings')) liveMuscleCounts['Hamstrings'] = (liveMuscleCounts['Hamstrings'] || 0) + setsCount;
        if (lower.includes('glutes')) liveMuscleCounts['Glutes'] = (liveMuscleCounts['Glutes'] || 0) + setsCount;
        if (lower.includes('calves')) liveMuscleCounts['Calves'] = (liveMuscleCounts['Calves'] || 0) + setsCount;
        if (lower.includes('core') || lower.includes('abs')) liveMuscleCounts['Core'] = (liveMuscleCounts['Core'] || 0) + setsCount;
      }
    });
  }

  return (
    <section className="tabbed-layout">
      <div className="sub-tabs">
        <button
          className={trainingTab === 'build' ? 'active' : ''}
          onClick={() => setTrainingTab('build')}
        >
          Workout Builder
        </button>
        <button
          className={trainingTab === 'list' ? 'active' : ''}
          onClick={() => setTrainingTab('list')}
        >
          My Workouts
        </button>
        <button
          className={trainingTab === 'exercises' ? 'active' : ''}
          onClick={() => setTrainingTab('exercises')}
        >
          Exercises
        </button>
      </div>

      {trainingTab === 'build' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left Column: Workout Form & Current Items */}
          <div className="panel form-card">
            <h2>Workout details</h2>
            <label>Name</label>
            <input
              name="name"
              value={workoutForm.name}
              onChange={(e) =>
                setWorkoutForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Lower body power"
            />
            <label>Estimated duration (mins)</label>
            <input
              name="duration_mins"
              value={workoutForm.duration_mins}
              onChange={(e) =>
                setWorkoutForm((prev) => ({ ...prev, duration_mins: e.target.value }))
              }
              placeholder="45"
            />
            <label>Workout Location Type</label>
            <select
              name="location_type"
              value={workoutForm.location_type || 'gym'}
              onChange={(e) =>
                setWorkoutForm((prev) => ({ ...prev, location_type: e.target.value }))
              }
            >
              <option value="gym">Gym / Training Facility</option>
              <option value="field">Football Field / Pitch</option>
              <option value="home">Home</option>
            </select>
            <div className="divider" />
            <div className="inline-action-row">
              <span>Add Exercise to Workout</span>
              <button className="secondary-button" onClick={handleExerciseModalOpen}>
                + New Exercise
              </button>
            </div>
            <div style={{ margin: '8px 0' }}>
              <input
                type="text"
                placeholder="🔍 Search exercises by title or muscle group..."
                value={workoutExerciseSearch}
                onChange={(e) => setWorkoutExerciseSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
              />
            </div>
            <select
              name="exercise_id"
              value={workoutForm.exercise_id}
              onChange={(e) =>
                setWorkoutForm((prev) => ({ ...prev, exercise_id: e.target.value }))
              }
            >
              <option value="">Choose exercise ({diagramFilteredExercises.length} matching options)</option>
              {diagramFilteredExercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name} {exercise.category ? `(${exercise.category})` : ''}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Weight Type:</span>
              <button
                type="button"
                style={{
                  cursor: 'pointer',
                  background: workoutForm.weight_mode !== 'raw' ? 'var(--primary)' : 'var(--input-bg)',
                  color: workoutForm.weight_mode !== 'raw' ? '#fff' : 'inherit',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                }}
                onClick={() => setWorkoutForm((prev) => ({ ...prev, weight_mode: 'percent' }))}
              >
                % of 1RM
              </button>
              <button
                type="button"
                style={{
                  cursor: 'pointer',
                  background: workoutForm.weight_mode === 'raw' ? 'var(--primary)' : 'var(--input-bg)',
                  color: workoutForm.weight_mode === 'raw' ? '#fff' : 'inherit',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                }}
                onClick={() => setWorkoutForm((prev) => ({ ...prev, weight_mode: 'raw' }))}
              >
                Raw Weight (lbs)
              </button>
            </div>
            <div className="inline-row">
              <input
                name="sets"
                value={workoutForm.sets}
                onChange={(e) =>
                  setWorkoutForm((prev) => ({ ...prev, sets: e.target.value }))
                }
                placeholder="Sets"
              />
              <input
                name="reps"
                value={workoutForm.reps}
                onChange={(e) =>
                  setWorkoutForm((prev) => ({ ...prev, reps: e.target.value }))
                }
                placeholder="Reps"
              />
              <input
                name="percent"
                value={workoutForm.percent}
                onChange={(e) =>
                  setWorkoutForm((prev) => ({ ...prev, percent: e.target.value }))
                }
                placeholder={workoutForm.weight_mode === 'raw' ? "Weight (lbs)" : "% of 1RM"}
              />
            </div>
            <button className="secondary-button" onClick={addWorkoutExercise}>
              Add to workout
            </button>
            <div className="list-group compact">
              {workoutForm.items.map((item, index) => (
                <div key={index} className="entity-card">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.sets}×{item.reps} · {item.weight}
                    </span>
                  </div>
                  <button
                    className="action-delete"
                    onClick={() => removeWorkoutExercise(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button className="primary-button" style={{ marginTop: '14px' }} onClick={saveWorkout}>
              Save workout
            </button>
          </div>

          {/* Right Column: Muscle Diagram & Filtered Exercise Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <MuscleDiagram
              selectedMuscle={selectedMuscles}
              onSelectMuscle={handleSelectMuscle}
              muscleFrequencies={liveMuscleCounts}
            />

            <div className="card" style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', maxHeight: '420px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>
                  {selectedMuscles && selectedMuscles.length > 0 ? `📌 Filtered (${diagramFilteredExercises.length}) [${selectedMuscles.join(', ')}]` : `📚 All Exercises (${diagramFilteredExercises.length})`}
                </h4>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  onClick={handleExerciseModalOpen}
                >
                  + Add New
                </button>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="🔍 Filter list by exercise title or muscle..."
                  value={workoutExerciseSearch}
                  onChange={(e) => setWorkoutExerciseSearch(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {diagramFilteredExercises.length ? (
                  diagramFilteredExercises.map((ex) => (
                    <div
                      key={ex.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: String(workoutForm.exercise_id) === String(ex.id) ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg)',
                        border: String(workoutForm.exercise_id) === String(ex.id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>{ex.name}</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {ex.category || 'General'} {ex.one_rm ? `· ${ex.one_rm} 1RM` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="primary-button"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => setWorkoutForm((prev) => ({ ...prev, exercise_id: ex.id }))}
                      >
                        {String(workoutForm.exercise_id) === String(ex.id) ? '✓ Selected' : '+ Select'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>
                    No exercises found for "{selectedMuscles.join(', ')}". Click "+ Add New" above!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : trainingTab === 'list' ? (
        <div className="panel list-card">
          <div className="section-title">
            <h2>My saved workouts</h2>
            <button className="secondary-button" onClick={() => setTrainingTab('build')}>
              New workout
            </button>
          </div>
          <div className="event-list">
            {workouts.length ? (
              workouts.map((workout) => (
                <div key={workout.id} className="entity-card">
                  <div>
                    <strong>{workout.name}</strong>
                    <span>{workout.duration_mins || 'N/A'} mins · {(workout.location_type || 'gym').toUpperCase()}</span>
                  </div>
                  <div className="action-row">
                    <button onClick={() => editWorkout(workout)}>Edit</button>
                    <button
                      className="action-delete"
                      onClick={() => deleteWorkout(workout.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No workouts yet.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="panel list-card">
          <div className="section-title">
            <h2>Exercise library</h2>
            <button className="primary-button" onClick={handleExerciseModalOpen}>
              Add exercise
            </button>
          </div>
          <div className="search-row">
            <input
              value={exerciseLibrarySearch}
              onChange={(e) => setExerciseLibrarySearch(e.target.value)}
              placeholder="Search exercises"
            />
          </div>
          <div className="exercise-list-scroll">
            {filteredExercises.length ? (
              filteredExercises.map((exercise) => (
                <div key={exercise.id} className="entity-card">
                  <div>
                    <strong>{exercise.name}</strong>
                    <span>
                      {exercise.one_rm ? `${exercise.one_rm} 1RM` : 'No 1RM yet'}
                    </span>
                  </div>
                  <div className="action-row">
                    <button onClick={() => openExerciseEdit(exercise)}>Edit</button>
                    <button
                      className="action-delete"
                      onClick={() => handleDeleteExercise(exercise.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No exercises found.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
