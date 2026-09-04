import React, { useState } from 'react';

export default function MuscleDiagram({ selectedMuscle, onSelectMuscle, muscleFrequencies = {}, relativeColoring = false }) {
  const [view, setView] = useState('front'); // 'front' or 'back'

  const isMuscleSelected = (muscleKey) => {
    if (!selectedMuscle) return false;
    if (Array.isArray(selectedMuscle)) return selectedMuscle.includes(muscleKey);
    return selectedMuscle === muscleKey;
  };

  const getMuscleStyle = (muscleKey) => {
    const isSelected = isMuscleSelected(muscleKey);
    const count = muscleFrequencies[muscleKey] || 0;

    let fill = 'rgba(220, 38, 38, 0.45)'; // Deep Red (0)
    let stroke = '#dc2626';

    if (relativeColoring) {
      const allCounts = Object.values(muscleFrequencies);
      const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 0;
      
      if (count > 0 && maxCount > 0) {
        const ratio = count / maxCount;
        if (ratio <= 0.33) {
          fill = 'rgba(249, 115, 22, 0.6)'; // Orange
          stroke = '#f97316';
        } else if (ratio <= 0.66) {
          fill = 'rgba(234, 179, 8, 0.65)'; // Yellow
          stroke = '#eab308';
        } else {
          fill = 'rgba(34, 197, 94, 0.7)'; // Green
          stroke = '#22c55e';
        }
      }
    } else {
      if (count === 1 || count === 2) {
        fill = 'rgba(234, 179, 8, 0.5)'; // Yellow / Orange (1-2)
        stroke = '#eab308';
      } else if (count >= 3) {
        fill = 'rgba(34, 197, 94, 0.6)'; // Vibrant Green (3+)
        stroke = '#22c55e';
      }
    }

    // Enhance selection highlights dynamically regardless of base color
    let selectedFill = fill;
    if (isSelected) {
      if (fill.includes('0.45')) selectedFill = fill.replace('0.45', '0.8');
      else if (fill.includes('0.5')) selectedFill = fill.replace('0.5', '0.85');
      else if (fill.includes('0.6')) selectedFill = fill.replace('0.6', '0.9');
      else if (fill.includes('0.65')) selectedFill = fill.replace('0.65', '0.9');
      else if (fill.includes('0.7')) selectedFill = fill.replace('0.7', '0.95');
    }

    return {
      fill: selectedFill,
      stroke: isSelected ? '#ffffff' : stroke,
      strokeWidth: isSelected ? '3' : '1.3',
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      filter: isSelected ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.9)) brightness(1.2)' : 'none',
    };
  };

  const muscleListFront = [
    { key: 'Chest', label: 'Chest' },
    { key: 'Shoulders', label: 'Shoulders' },
    { key: 'Biceps', label: 'Biceps' },
    { key: 'Core', label: 'Core / Abs' },
    { key: 'Quads', label: 'Quads / Thighs' },
  ];

  const muscleListBack = [
    { key: 'Back', label: 'Back (Traps / Lats)' },
    { key: 'Shoulders', label: 'Rear Delt / Shoulders' },
    { key: 'Triceps', label: 'Triceps' },
    { key: 'Glutes', label: 'Glutes' },
    { key: 'Hamstrings', label: 'Hamstrings' },
    { key: 'Calves', label: 'Calves' },
  ];

  return (
    <div className="card" style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            💪 Interactive Muscle Diagram
          </h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Click any muscle group(s) below or on the diagram to multi-select & filter exercises
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="secondary-button"
            style={{
              padding: '4px 12px',
              fontSize: '0.8rem',
              background: view === 'front' ? 'var(--primary)' : 'transparent',
              color: view === 'front' ? '#fff' : 'var(--text)',
              borderColor: view === 'front' ? 'var(--primary)' : 'var(--border)',
            }}
            onClick={() => setView('front')}
          >
            Anterior (Front)
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{
              padding: '4px 12px',
              fontSize: '0.8rem',
              background: view === 'back' ? 'var(--primary)' : 'transparent',
              color: view === 'back' ? '#fff' : 'var(--text)',
              borderColor: view === 'back' ? 'var(--primary)' : 'var(--border)',
            }}
            onClick={() => setView('back')}
          >
            Posterior (Back)
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
        {/* SVG Diagram Container */}
        <div style={{ width: '220px', height: '380px', position: 'relative', display: 'flex', justifyContent: 'center', background: 'var(--bg)', borderRadius: '10px', padding: '10px', border: '1px solid var(--border)' }}>
          {view === 'front' ? (
            /* Front (Anterior) View SVG */
            <svg viewBox="0 0 200 380" style={{ width: '100%', height: '100%' }}>
              <circle cx="100" cy="30" r="18" fill="var(--border)" opacity="0.5" />
              <path d="M 90,48 L 110,48 L 115,62 L 85,62 Z" fill="var(--border)" opacity="0.5" />
              <path
                d="M 85,62 C 65,65 52,78 52,98 C 52,115 62,118 66,115 C 70,112 75,90 85,78 Z"
                style={getMuscleStyle('Shoulders')}
                onClick={() => onSelectMuscle('Shoulders')}
                title="Shoulders (Left Deltoid)"
              />
              <path
                d="M 115,62 C 135,65 148,78 148,98 C 148,115 138,118 134,115 C 130,112 125,90 115,78 Z"
                style={getMuscleStyle('Shoulders')}
                onClick={() => onSelectMuscle('Shoulders')}
                title="Shoulders (Right Deltoid)"
              />
              <path
                d="M 85,64 L 99,64 L 99,105 C 88,106 73,102 70,86 C 68,74 76,66 85,64 Z"
                style={getMuscleStyle('Chest')}
                onClick={() => onSelectMuscle('Chest')}
                title="Chest (Left Pectoral)"
              />
              <path
                d="M 115,64 L 101,64 L 101,105 C 112,106 127,102 130,86 C 132,74 124,66 115,64 Z"
                style={getMuscleStyle('Chest')}
                onClick={() => onSelectMuscle('Chest')}
                title="Chest (Right Pectoral)"
              />
              <path
                d="M 66,115 C 64,130 62,145 64,158 C 68,160 74,158 76,145 C 78,132 75,118 66,115 Z"
                style={getMuscleStyle('Biceps')}
                onClick={() => onSelectMuscle('Biceps')}
                title="Biceps (Left)"
              />
              <path
                d="M 134,115 C 136,130 138,145 136,158 C 132,160 126,158 124,145 C 122,132 125,118 134,115 Z"
                style={getMuscleStyle('Biceps')}
                onClick={() => onSelectMuscle('Biceps')}
                title="Biceps (Right)"
              />
              <path
                d="M 64,158 C 60,180 58,200 58,215 L 68,215 C 70,195 72,175 74,158 Z"
                fill="var(--border)" opacity="0.6"
              />
              <path
                d="M 136,158 C 140,180 142,200 142,215 L 132,215 C 130,195 128,175 126,158 Z"
                fill="var(--border)" opacity="0.6"
              />
              <path
                d="M 85,108 L 115,108 L 114,175 C 105,180 95,180 86,175 Z"
                style={getMuscleStyle('Core')}
                onClick={() => onSelectMuscle('Core')}
                title="Core / Abdominals"
              />
              <path d="M 70,108 L 83,108 L 84,170 L 68,160 Z" fill="var(--border)" opacity="0.5" />
              <path d="M 130,108 L 117,108 L 116,170 L 132,160 Z" fill="var(--border)" opacity="0.5" />
              <path
                d="M 72,182 L 96,182 L 94,270 C 86,275 78,275 70,268 Z"
                style={getMuscleStyle('Quads')}
                onClick={() => onSelectMuscle('Quads')}
                title="Quads / Left Thigh"
              />
              <path
                d="M 128,182 L 104,182 L 106,270 C 114,275 122,275 130,268 Z"
                style={getMuscleStyle('Quads')}
                onClick={() => onSelectMuscle('Quads')}
                title="Quads / Right Thigh"
              />
              <path d="M 70,274 L 92,274 L 88,350 L 74,350 Z" fill="var(--border)" opacity="0.6" />
              <path d="M 130,274 L 108,274 L 112,350 L 126,350 Z" fill="var(--border)" opacity="0.6" />
            </svg>
          ) : (
            /* Back (Posterior) View SVG */
            <svg viewBox="0 0 200 380" style={{ width: '100%', height: '100%' }}>
              <circle cx="100" cy="30" r="18" fill="var(--border)" opacity="0.5" />
              <path d="M 88,48 L 112,48 L 116,66 L 84,66 Z" fill="var(--border)" opacity="0.5" />
              <path
                d="M 84,66 C 64,68 52,80 52,98 C 52,112 60,116 66,112 C 72,108 78,85 86,76 Z"
                style={getMuscleStyle('Shoulders')}
                onClick={() => onSelectMuscle('Shoulders')}
                title="Rear Shoulders (Left)"
              />
              <path
                d="M 116,66 C 136,68 148,80 148,98 C 148,112 140,116 134,112 C 128,108 122,85 114,76 Z"
                style={getMuscleStyle('Shoulders')}
                onClick={() => onSelectMuscle('Shoulders')}
                title="Rear Shoulders (Right)"
              />
              <path
                d="M 86,68 L 114,68 L 124,115 L 114,165 L 86,165 L 76,115 Z"
                style={getMuscleStyle('Back')}
                onClick={() => onSelectMuscle('Back')}
                title="Upper & Mid Back (Traps / Lats)"
              />
              <path
                d="M 66,112 C 63,128 61,142 63,156 C 67,158 73,156 75,142 C 77,128 73,115 66,112 Z"
                style={getMuscleStyle('Triceps')}
                onClick={() => onSelectMuscle('Triceps')}
                title="Triceps (Left)"
              />
              <path
                d="M 134,112 C 137,128 139,142 137,156 C 133,158 127,156 125,142 C 123,128 127,115 134,112 Z"
                style={getMuscleStyle('Triceps')}
                onClick={() => onSelectMuscle('Triceps')}
                title="Triceps (Right)"
              />
              <path d="M 63,156 C 59,178 57,198 57,215 L 67,215 C 69,195 71,175 73,156 Z" fill="var(--border)" opacity="0.6" />
              <path d="M 137,156 C 141,178 143,198 143,215 L 133,215 C 131,195 129,175 127,156 Z" fill="var(--border)" opacity="0.6" />
              <path d="M 86,165 L 114,165 L 112,185 L 88,185 Z" style={getMuscleStyle('Back')} onClick={() => onSelectMuscle('Back')} title="Lower Back" />
              <path
                d="M 72,186 L 98,186 L 96,248 C 86,252 76,250 70,240 Z"
                style={getMuscleStyle('Glutes')}
                onClick={() => onSelectMuscle('Glutes')}
                title="Glutes (Left)"
              />
              <path
                d="M 128,186 L 102,186 L 104,248 C 114,252 124,250 130,240 Z"
                style={getMuscleStyle('Glutes')}
                onClick={() => onSelectMuscle('Glutes')}
                title="Glutes (Right)"
              />
              <path
                d="M 72,252 L 96,252 L 94,305 C 86,310 78,310 70,305 Z"
                style={getMuscleStyle('Hamstrings')}
                onClick={() => onSelectMuscle('Hamstrings')}
                title="Hamstrings (Left)"
              />
              <path
                d="M 128,252 L 104,252 L 106,305 C 114,310 122,310 130,305 Z"
                style={getMuscleStyle('Hamstrings')}
                onClick={() => onSelectMuscle('Hamstrings')}
                title="Hamstrings (Right)"
              />
              <path
                d="M 70,310 L 94,310 L 90,368 L 74,368 Z"
                style={getMuscleStyle('Calves')}
                onClick={() => onSelectMuscle('Calves')}
                title="Calves (Left)"
              />
              <path
                d="M 130,310 L 106,310 L 110,368 L 126,368 Z"
                style={getMuscleStyle('Calves')}
                onClick={() => onSelectMuscle('Calves')}
                title="Calves (Right)"
              />
            </svg>
          )}
        </div>

        {/* Interactive Muscle Group Pills / Counts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px', flex: 1 }}>
          <button
            type="button"
            style={{
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: '6px',
              border: (!selectedMuscle || (Array.isArray(selectedMuscle) && selectedMuscle.length === 0)) ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: (!selectedMuscle || (Array.isArray(selectedMuscle) && selectedMuscle.length === 0)) ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg)',
              color: (!selectedMuscle || (Array.isArray(selectedMuscle) && selectedMuscle.length === 0)) ? 'var(--primary)' : 'var(--text)',
              cursor: 'pointer',
              fontWeight: (!selectedMuscle || (Array.isArray(selectedMuscle) && selectedMuscle.length === 0)) ? 600 : 400,
              fontSize: '0.85rem',
            }}
            onClick={() => onSelectMuscle(null)}
          >
            🌟 All Muscles / Full Library
          </button>
          {(view === 'front' ? muscleListFront : muscleListBack).map((m) => {
            const isSel = isMuscleSelected(m.key);
            const count = muscleFrequencies[m.key] || 0;
            const bulletColor = count === 0 ? '#dc2626' : count <= 2 ? '#eab308' : '#22c55e';
            return (
              <button
                key={m.key}
                type="button"
                style={{
                  textAlign: 'left',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: isSel ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSel ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg)',
                  color: isSel ? 'var(--primary)' : 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: isSel ? 600 : 400,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
                onClick={() => onSelectMuscle(m.key)}
              >
                <span>
                  <span style={{ color: bulletColor, marginRight: '6px', fontWeight: 'bold', fontSize: '1rem' }}>●</span>
                  {m.label}
                </span>
                <span style={{ background: bulletColor, color: count === 0 ? '#fff' : '#000', fontSize: '0.75rem', padding: '1px 7px', borderRadius: '10px', fontWeight: 600 }}>
                  {count}
                </span>
              </button>
            );
          })}
          {((Array.isArray(selectedMuscle) && selectedMuscle.length > 0) || (typeof selectedMuscle === 'string' && selectedMuscle)) && (
            <button
              type="button"
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                fontSize: '0.8rem',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onClick={() => onSelectMuscle(null)}
            >
              ✕ Clear Filter ({Array.isArray(selectedMuscle) ? selectedMuscle.join(', ') : selectedMuscle})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
