import React from 'react';

export default function EventDetailsModal({
  selectedEvent,
  eventModalVisible,
  setSelectedEvent,
  openEventEdit,
  handleDeleteEvent,
}) {
  if (!selectedEvent || eventModalVisible) return null;

  return (
    <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Event details</h3>
        <p>
          <strong>{selectedEvent.title}</strong>
        </p>
        <p>{selectedEvent.event_type}</p>
        <p>
          {selectedEvent.event_date} {selectedEvent.start_time || ''}
        </p>
        <p>Duration: {selectedEvent.duration_mins || '60'} min</p>
        <p>{selectedEvent.notes || 'No notes'}</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setSelectedEvent(null)}>
            Close
          </button>
          <button className="secondary-button" onClick={() => openEventEdit(selectedEvent)}>
            Edit
          </button>
          <button className="action-delete" onClick={() => handleDeleteEvent(selectedEvent.id)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
