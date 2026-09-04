import React, { useState, useEffect } from 'react';

export default function SettingsModal({
  isOpen,
  onClose,
  userSettings,
  onSaveSettings,
}) {
  const [form, setForm] = useState({
    home_address: '',
    gym_address: '',
    gym_commute_mins: '20',
    work_address: '',
    work_commute_mins: '25',
    field_address: '',
    field_commute_mins: '30',
    default_commute_mins: '20',
    custom_locations: '[]',
  });

  const [customList, setCustomList] = useState([]);
  const [newCustom, setNewCustom] = useState({ name: '', address: '', mins: '15' });

  useEffect(() => {
    if (userSettings) {
      setForm({
        home_address: userSettings.home_address || '',
        gym_address: userSettings.gym_address || '',
        gym_commute_mins: userSettings.gym_commute_mins || '20',
        work_address: userSettings.work_address || '',
        work_commute_mins: userSettings.work_commute_mins || '25',
        field_address: userSettings.field_address || '',
        field_commute_mins: userSettings.field_commute_mins || '30',
        default_commute_mins: userSettings.default_commute_mins || '20',
        custom_locations: userSettings.custom_locations || '[]',
      });
      try {
        setCustomList(JSON.parse(userSettings.custom_locations || '[]'));
      } catch (e) {
        setCustomList([]);
      }
    }
  }, [userSettings, isOpen]);

  if (!isOpen) return null;

  const handleAddCustom = () => {
    if (!newCustom.name.trim()) return;
    const updated = [...customList, { ...newCustom, id: Date.now() }];
    setCustomList(updated);
    setForm((prev) => ({ ...prev, custom_locations: JSON.stringify(updated) }));
    setNewCustom({ name: '', address: '', mins: '15' });
  };

  const handleRemoveCustom = (id) => {
    const updated = customList.filter((item) => item.id !== id);
    setCustomList(updated);
    setForm((prev) => ({ ...prev, custom_locations: JSON.stringify(updated) }));
  };

  const handleSave = () => {
    onSaveSettings({
      ...form,
      custom_locations: JSON.stringify(customList),
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>App & Commute Settings</h3>
        <p className="subtitle" style={{ marginBottom: '16px' }}>
          Configure your addresses and preset commute durations so they auto-fill when scheduling events.
        </p>
        
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontWeight: 600 }}>Home Address (Start / End base for commutes)</label>
          <input
            value={form.home_address}
            onChange={(e) => setForm((prev) => ({ ...prev, home_address: e.target.value }))}
            placeholder="e.g. 123 Main St, Toronto, ON"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontWeight: 600 }}>Work Address</label>
            <input
              value={form.work_address}
              onChange={(e) => setForm((prev) => ({ ...prev, work_address: e.target.value }))}
              placeholder="e.g. Downtown Office Tower"
            />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Preset Commute (mins)</label>
            <input
              type="number"
              value={form.work_commute_mins}
              onChange={(e) => setForm((prev) => ({ ...prev, work_commute_mins: e.target.value }))}
              placeholder="25"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontWeight: 600 }}>Gym Address</label>
            <input
              value={form.gym_address}
              onChange={(e) => setForm((prev) => ({ ...prev, gym_address: e.target.value }))}
              placeholder="e.g. Performance Gym, King St W"
            />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Preset Commute (mins)</label>
            <input
              type="number"
              value={form.gym_commute_mins}
              onChange={(e) => setForm((prev) => ({ ...prev, gym_commute_mins: e.target.value }))}
              placeholder="20"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontWeight: 600 }}>Preferred Field / Sport Address</label>
            <input
              value={form.field_address}
              onChange={(e) => setForm((prev) => ({ ...prev, field_address: e.target.value }))}
              placeholder="e.g. Varsity Stadium"
            />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Preset Commute (mins)</label>
            <input
              type="number"
              value={form.field_commute_mins}
              onChange={(e) => setForm((prev) => ({ ...prev, field_commute_mins: e.target.value }))}
              placeholder="30"
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 600 }}>Default Fallback Commute Duration (mins)</label>
          <input
            type="number"
            value={form.default_commute_mins}
            onChange={(e) => setForm((prev) => ({ ...prev, default_commute_mins: e.target.value }))}
            placeholder="20"
          />
        </div>

        <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />

        <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Custom Frequent Locations</h4>
        {customList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {customList.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div>
                  <strong>{item.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({item.address || 'No address'})</span> - <em>~{item.mins} mins</em>
                </div>
                <button type="button" className="icon-button" style={{ color: '#ef4444' }} onClick={() => handleRemoveCustom(item.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr auto', gap: '8px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.8rem' }}>Name</label>
            <input
              value={newCustom.name}
              onChange={(e) => setNewCustom((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Grocery Store"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem' }}>Address (Opt)</label>
            <input
              value={newCustom.address}
              onChange={(e) => setNewCustom((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="e.g. Loblaws"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem' }}>Mins</label>
            <input
              type="number"
              value={newCustom.mins}
              onChange={(e) => setNewCustom((prev) => ({ ...prev, mins: e.target.value }))}
              placeholder="15"
            />
          </div>
          <div>
            <button type="button" className="secondary-button" style={{ padding: '8px 12px', height: '38px' }} onClick={handleAddCustom}>+ Add</button>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
