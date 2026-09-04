import React, { useState, useEffect } from 'react';

export default function PartialShopModal({ isOpen, onClose, list, onSave }) {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    if (list && list.items_json) {
      try {
        setItems(JSON.parse(list.items_json));
      } catch (e) {
        setItems([]);
      }
    }
  }, [list]);

  if (!isOpen || !list) return null;

  function toggleItem(index) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  }

  function addItem(e) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: null, name: newItemName.trim(), category: 'Extra', grams: 0, checked: false },
    ]);
    setNewItemName('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Grocery Shop — {list.week_label || 'Weekly Shop'}</h3>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Check off the items you purchased (they will be marked as in stock). You can also add extra items you bought.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
          {items.map((item, idx) => (
            <label
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: 'var(--input-bg)',
                borderRadius: '6px',
                cursor: 'pointer',
                textDecoration: item.checked ? 'line-through' : 'none',
                opacity: item.checked ? 0.6 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={item.checked || false}
                onChange={() => toggleItem(idx)}
              />
              <span style={{ flex: 1, fontWeight: 500 }}>{item.name}</span>
              {item.grams ? <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.grams}g</span> : null}
              <span className="pill" style={{ fontSize: '0.75rem' }}>{item.category}</span>
            </label>
          ))}
          {items.length === 0 && <div className="empty-state">No items in this list.</div>}
        </div>

        <form onSubmit={addItem} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input
            placeholder="Add extra item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="secondary-button">Add</button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button
            className="primary-button"
            onClick={() => {
              onSave(list.id, items);
              onClose();
            }}
          >
            Save Partial Shop
          </button>
        </div>
      </div>
    </div>
  );
}
