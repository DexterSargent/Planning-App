import React from 'react';

export default function ExerciseModal({
  exerciseModalVisible,
  setExerciseModalVisible,
  editingExercise,
  exerciseForm,
  setExerciseForm,
  handleSaveExercise,
}) {
  if (!exerciseModalVisible) return null;

  return (
    <div className="modal-overlay" onClick={() => setExerciseModalVisible(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{editingExercise ? 'Edit exercise' : 'Add exercise'}</h3>
        <label>Name</label>
        <input
          value={exerciseForm.name}
          onChange={(e) =>
            setExerciseForm((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Barbell Back Squat"
        />
        <label>Category</label>
        <input
          value={exerciseForm.category}
          onChange={(e) =>
            setExerciseForm((prev) => ({ ...prev, category: e.target.value }))
          }
          placeholder="Lower body"
        />
        <label>Optional 1RM</label>
        <input
          value={exerciseForm.one_rm}
          onChange={(e) =>
            setExerciseForm((prev) => ({ ...prev, one_rm: e.target.value }))
          }
          placeholder="225"
        />
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setExerciseModalVisible(false)}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSaveExercise}>
            {editingExercise ? 'Save changes' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
