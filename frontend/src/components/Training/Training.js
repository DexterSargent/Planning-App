import React from 'react';

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
        <div className="form-grid">
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
            <div className="divider" />
            <div className="inline-action-row">
              <span>Exercises</span>
              <button className="secondary-button" onClick={handleExerciseModalOpen}>
                Add exercise
              </button>
            </div>
            <select
              name="exercise_id"
              value={workoutForm.exercise_id}
              onChange={(e) =>
                setWorkoutForm((prev) => ({ ...prev, exercise_id: e.target.value }))
              }
            >
              <option value="">Choose exercise</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
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
                placeholder="%1RM"
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
            <button className="primary-button" onClick={saveWorkout}>
              Save workout
            </button>
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
                    <span>{workout.duration_mins || 'N/A'} mins</span>
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
