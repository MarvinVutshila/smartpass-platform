import { useEffect, useState } from 'react';
import { CalendarIcon, MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = sessionStorage.getItem('access_token');

  useEffect(() => {
    API.get('/events')
      .then(res => {
        const now = new Date();
        // Keep only events where start_date is strictly after now
        const upcoming = res.data.filter(event => new Date(event.start_date) > now);
        // Sort by start_date ascending (soonest first)
        upcoming.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        setEvents(upcoming);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const buyTicket = (eventId) => {
    if (!token) {
      sessionStorage.setItem('intendedEventId', eventId);
      navigate('/login');
      return;
    }
    navigate(`/checkout?eventId=${eventId}`);
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center' }}>Loading events...</div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <h1>Smart Event Ticketing</h1>
        <p>Discover events, buy tickets instantly, and manage access securely.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' })}>
            Browse Events
          </button>
          {token && (
            <button className="btn-outline" onClick={() => navigate('/my-tickets')}>
              My Tickets
            </button>
          )}
        </div>
      </section>

      {/* Events Section */}
      <h2 id="events-section" className="section-title">Upcoming Events</h2>
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f1f5f9', borderRadius: '1rem' }}>
          <CalendarIcon style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem', color: '#94a3b8' }} />
          <p>No upcoming events at the moment. Check back later!</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map(event => (
            <div className="event-card" key={event.id}>
              <div className="event-card-top"></div>
              <div className="event-card-content">
                <h3 className="event-title">{event.name}</h3>
                <p className="event-desc">{event.description || 'Experience an unforgettable event.'}</p>
                <div className="event-detail">
                  <CalendarIcon /> {new Date(event.start_date).toLocaleString()}
                </div>
                <div className="event-detail">
                  <MapPinIcon /> {event.venue}
                </div>
                <div className="event-price">${event.ticket_price}</div>
                <button className="btn-buy" onClick={() => buyTicket(event.id)}>
                  Get Ticket
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}