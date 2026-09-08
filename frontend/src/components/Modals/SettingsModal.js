import React, { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
import GeoapifyAutocomplete from './GeoapifyAutocomplete';

export default function SettingsModal({
  isOpen,
  onClose,
  userSettings,
  onSaveSettings,
}) {
  const [form, setForm] = useState({
    home_address: '',
    home_coords: '',
    gym_address: '',
    gym_coords: '',
    gym_commute_mins: '20',
    work_address: '',
    work_coords: '',
    work_commute_mins: '25',
    field_address: '',
    field_coords: '',
    field_commute_mins: '30',
    default_commute_mins: '20',
    custom_locations: '[]',
    school_classes: '[]',
  });

  const [customList, setCustomList] = useState([]);
  const [newCustom, setNewCustom] = useState({ name: '', address: '', lat: null, lon: null, mins: '15' });

  const [schoolClassList, setSchoolClassList] = useState([]);
  const [newSchoolClass, setNewSchoolClass] = useState('');

  useEffect(() => {
    if (userSettings) {
      setForm({
        home_address: userSettings.home_address || '',
        home_coords: userSettings.home_coords || '',
        gym_address: userSettings.gym_address || '',
        gym_coords: userSettings.gym_coords || '',
        gym_commute_mins: userSettings.gym_commute_mins || '20',
        work_address: userSettings.work_address || '',
        work_coords: userSettings.work_coords || '',
        work_commute_mins: userSettings.work_commute_mins || '25',
        field_address: userSettings.field_address || '',
        field_coords: userSettings.field_coords || '',
        field_commute_mins: userSettings.field_commute_mins || '30',
        default_commute_mins: userSettings.default_commute_mins || '20',
        custom_locations: userSettings.custom_locations || '[]',
        school_classes: userSettings.school_classes || '[]',
      });
      try {
        setCustomList(JSON.parse(userSettings.custom_locations || '[]'));
      } catch (e) {
        setCustomList([]);
      }
      try {
        setSchoolClassList(JSON.parse(userSettings.school_classes || '[]'));
      } catch (e) {
        setSchoolClassList([]);
      }
    }
  }, [userSettings, isOpen]);

  if (!isOpen) return null;

  const handleAddCustom = () => {
    if (!newCustom.name.trim()) return;
    const updated = [...customList, { ...newCustom, id: Date.now() }];
    setCustomList(updated);
    setForm((prev) => ({ ...prev, custom_locations: JSON.stringify(updated) }));
    setNewCustom({ name: '', address: '', lat: null, lon: null, mins: '15' });
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
      school_classes: JSON.stringify(schoolClassList),
    });
    onClose();
  };

  const handleAddSchoolClass = () => {
    if (!newSchoolClass.trim()) return;
    const updated = [...schoolClassList, newSchoolClass.trim()];
    setSchoolClassList(updated);
    setForm((prev) => ({ ...prev, school_classes: JSON.stringify(updated) }));
    setNewSchoolClass('');
  };

  const handleRemoveSchoolClass = (className) => {
    const updated = schoolClassList.filter((c) => c !== className);
    setSchoolClassList(updated);
    setForm((prev) => ({ ...prev, school_classes: JSON.stringify(updated) }));
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
          <GeoapifyAutocomplete
            value={form.home_address}
            onSelect={(addr, lat, lon) => setForm((prev) => ({ ...prev, home_address: addr, home_coords: `${lat},${lon}` }))}
            placeholder="e.g. 123 Main St, Toronto, ON"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontWeight: 600 }}>Work Address</label>
            <GeoapifyAutocomplete
              value={form.work_address}
              onSelect={(addr, lat, lon) => setForm((prev) => ({ ...prev, work_address: addr, work_coords: `${lat},${lon}` }))}
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
            <GeoapifyAutocomplete
              value={form.gym_address}
              onSelect={(addr, lat, lon) => setForm((prev) => ({ ...prev, gym_address: addr, gym_coords: `${lat},${lon}` }))}
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
            <GeoapifyAutocomplete
              value={form.field_address}
              onSelect={(addr, lat, lon) => setForm((prev) => ({ ...prev, field_address: addr, field_coords: `${lat},${lon}` }))}
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
            <GeoapifyAutocomplete
              value={newCustom.address}
              onSelect={(addr, lat, lon) => setNewCustom((prev) => ({ ...prev, address: addr, lat, lon }))}
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
            <button type="button" className="secondary-button" style={{ padding: '8px 12px', height: '38px' }} onClick={handleAddCustom}>
              <Plus size={16} className="inline-icon" /> Add
            </button>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />

        <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>School Classes</h4>
        {schoolClassList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {schoolClassList.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div><strong>{c}</strong></div>
                <button type="button" className="icon-button" style={{ color: '#ef4444' }} onClick={() => handleRemoveSchoolClass(c)}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.8rem' }}>Class Name</label>
            <input
              value={newSchoolClass}
              onChange={(e) => setNewSchoolClass(e.target.value)}
              placeholder="e.g. MATH 101"
            />
          </div>
          <div>
            <button type="button" className="secondary-button" style={{ padding: '8px 12px', height: '38px' }} onClick={handleAddSchoolClass}>
              <Plus size={16} className="inline-icon" /> Add
            </button>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="secondary-button" onClick={onClose}>
            <X size={16} className="inline-icon" /> Cancel
          </button>
          <button className="primary-button" onClick={handleSave}>
            <Save size={16} className="inline-icon" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
