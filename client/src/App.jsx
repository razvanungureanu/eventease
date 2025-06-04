import { useState, useEffect } from 'react';
import Login from './Login.jsx';
import TicketSection from './TicketSection.jsx';
import MapView from './Map.jsx';
import LocationSearch from './LocationSearch.jsx';

function App() {
  const [location, setLocation] = useState('');
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({ name: '', description: '', location: '', category: '', date: '', lat: '', lon: '' });

  useEffect(() => {
    fetch('http://localhost:3000/session', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  const formatEventDate = (dateStr) => {
    const str = String(dateStr);
    if (str.length !== 6) return str;
    const year = `20${str.slice(0, 2)}`;
    const month = str.slice(2, 4);
    const day = str.slice(4, 6);
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const unformatEventDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${year.slice(2)}${month}${day}`;
  };

  const fetchCoordsFromCity = async (cityName) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`);
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      } else {
        throw new Error('No coordinates found');
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
      throw err;
    }
  };

  const handleLogout = async () => {
    await fetch('http://localhost:3000/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
  };

  const searchEvents = async () => {
    try {
      const res = await fetch(`http://localhost:3000/events?location=${encodeURIComponent(location)}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateEvent = async () => {
    try {
      let coords = { lat: newEvent.lat, lon: newEvent.lon };
      if (!coords.lat || !coords.lon) {
        coords = await fetchCoordsFromCity(newEvent.location);
      }
      const eventToSend = { ...newEvent, ...coords, date: unformatEventDate(newEvent.date) };
      const res = await fetch('http://localhost:3000/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventToSend)
      });
      if (!res.ok) throw new Error('Failed to create event');
      const created = await res.json();
      setEvents([...events, created]);
      setNewEvent({ name: '', description: '', location: '', category: '', date: '', lat: '', lon: '' });
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent({ ...event, date: formatEventDate(event.date) });
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      const eventToSend = { ...editingEvent, date: unformatEventDate(editingEvent.date) };
      const res = await fetch(`http://localhost:3000/events/${editingEvent.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventToSend)
      });
      if (!res.ok) throw new Error('Failed to update event');
      const updated = await res.json();
      setEvents(events.map(ev => ev.id === updated.id ? updated : ev));
      setEditingEvent(null);
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await fetch(`http://localhost:3000/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Delete failed');
      setEvents(events.filter(e => e.id !== eventId));
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>EventEase – Find Events</h1>

      {user ? (
        <div>
          <p>✅ Logged in as <strong>{user.username}</strong>{user.isAdmin ? ' (Admin)' : ''}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <Login onLogin={setUser} />
      )}

      <div style={{ marginTop: '1rem' }}>
        <input
          type="text"
          placeholder="Enter location..."
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
        <button onClick={searchEvents}>Search</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      {user?.isAdmin && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Create New Event</h3>
          <input
            placeholder="name"
            value={newEvent.name}
            onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
          />
          <input
            placeholder="description"
            value={newEvent.description}
            onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
          />
          <LocationSearch
            value={newEvent.location}
            onSelect={(place) => {
              setNewEvent({
                ...newEvent,
                location: place.display_name,
                lat: place.lat,
                lon: place.lon
              });
            }}
          />
          <select
            value={newEvent.category}
            onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
          >
            <option value="">Select Category</option>
            <option value="concert">Concert</option>
            <option value="workshop">Workshop</option>
            <option value="sports">Sports</option>
            <option value="conference">Conference</option>
          </select>
          <input
            type="date"
            value={newEvent.date}
            onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
          />
          <button onClick={handleCreateEvent}>➕ Add Event</button>
        </div>
      )}

      {editingEvent && (
        <form onSubmit={handleSaveEvent}>
          <h3>Edit Event</h3>
          {['name', 'description', 'location', 'category'].map(field => (
            <input
              key={field}
              value={editingEvent[field]}
              onChange={e => setEditingEvent({ ...editingEvent, [field]: e.target.value })}
              placeholder={field}
            />
          ))}
          <input
            type="date"
            value={editingEvent.date}
            onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })}
          />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditingEvent(null)}>Cancel</button>
        </form>
      )}

      <MapView events={events.map(ev => ({ ...ev, date: formatEventDate(ev.date) }))} />

      <div style={{ marginTop: '2rem' }}>
        {events.map(event => (
          <div key={event.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
            <h3>{event.name}</h3>
            <p><strong>Description:</strong> {event.description}</p>
            <p><strong>Location:</strong> {event.location}</p>
            <p><strong>Category:</strong> {event.category}</p>
            <p><strong>Date:</strong> {formatEventDate(event.date)}</p>
            {user?.isAdmin && (
              <div>
                <button onClick={() => handleEditEvent(event)}>✏️ Edit</button>
                <button onClick={() => handleDeleteEvent(event.id)} style={{ color: 'red' }}>🗑️ Delete</button>
              </div>
            )}
            <TicketSection eventId={event.id} user={user} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
