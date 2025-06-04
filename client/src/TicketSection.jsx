import { useState, useEffect } from 'react';

function TicketSection({ eventId, user }) {
  const [tickets, setTickets] = useState([]);
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [availability, setAvailability] = useState('');
  const [ticketType, setTicketType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`http://localhost:3000/tickets/${eventId}`)
      .then(res => res.json())
      .then(data => setTickets(data))
      .catch(err => {
        console.error('Failed to fetch tickets:', err);
        setError('Failed to load tickets');
      });
  }, [eventId]);

  const createTicket = async () => {
    try {
      const res = await fetch('http://localhost:3000/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventID: eventId, ticketType: type, price: parseFloat(price), availability: parseInt(availability) })
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      const newTicket = await res.json();
      setTickets([...tickets, { id: newTicket.id, ticketType: type, price, availability }]);
      setType(''); setPrice(''); setAvailability('');
    } catch (err) {
      setError(err.message);
    }
  };

  const bookTicket = async () => {
    try {
      const res = await fetch('http://localhost:3000/book', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventID: eventId, ticketType, quantity: parseInt(quantity) })
      });
      if (!res.ok) throw new Error('Failed to book ticket');
      alert('✅ Ticket booked!');
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  return (
    <div>
      <button onClick={() => setTickets(t => t.length ? [] : t)}> {tickets.length ? 'Hide Tickets' : 'Show Tickets'} </button>
      {tickets.length > 0 && (
        <ul>
          {tickets.map(t => (
            <li key={t.id}>{t.ticketType} — £{t.price} ({t.availability} available)</li>
          ))}
        </ul>
      )}

      {user?.isAdmin && (
        <div style={{ marginTop: '0.5rem' }}>
          <h5>Add New Ticket</h5>
          <input value={type} onChange={e => setType(e.target.value)} placeholder="Type" />
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" />
          <input value={availability} onChange={e => setAvailability(e.target.value)} placeholder="Availability" />
          <button onClick={createTicket}>➕ Create</button>
        </div>
      )}

      <div style={{ marginTop: '0.5rem' }}>
        <label>Ticket Type: </label>
        <select value={ticketType} onChange={e => setTicketType(e.target.value)}>
          <option value="">Select</option>
          {tickets.map(t => (
            <option key={t.id} value={t.ticketType}>{t.ticketType}</option>
          ))}
        </select>
        <label> Quantity: </label>
        <input value={quantity} onChange={e => setQuantity(e.target.value)} />
        <button onClick={bookTicket}>Book Now</button>
      </div>

      {error && <p style={{ color: 'red' }}>❌ {error}</p>}
    </div>
  );
}

export default TicketSection;
