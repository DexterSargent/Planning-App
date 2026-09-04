import React from 'react';

const MUSCLE_CATEGORIES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Olympic',
  'Conditioning',
];

export default function ExerciseModal({
  exerciseModalVisible,
  setExerciseModalVisible,
  editingExercise,
  exerciseForm,
  setExerciseForm,
  handleSaveExercise,
}) {
  if (!exerciseModalVisible) return null;

  const currentCategories = (exerciseForm.category || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const toggleCategory = (cat) => {
    let next;
    if (currentCategories.includes(cat)) {
      next = currentCategories.filter((c) => c !== cat);
    } else {
      next = [...currentCategories, cat];
    }
    setExerciseForm((prev) => ({ ...prev, category: next.join(', ') }));
  };

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
        
        <label>Target Muscle Group(s) (Multi-Select)</label>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
          Click one or more muscle groups that this exercise targets:
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {MUSCLE_CATEGORIES.map((cat) => {
            const isSelected = currentCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 600 : 400,
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--primary)' : 'var(--bg)',
                  color: isSelected ? '#fff' : 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected ? '✓ ' : '+ '}{cat}
              </button>
            );
          })}
        </div>
        <input
          value={exerciseForm.category || ''}
          onChange={(e) =>
            setExerciseForm((prev) => ({ ...prev, category: e.target.value }))
          }
          placeholder="Comma-separated muscles (e.g. Quads, Glutes, Core)"
        />
        
        <label>Optional 1RM (lbs)</label>
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
