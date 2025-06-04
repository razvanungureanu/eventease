import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix default marker icon path issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapView({ events }) {
  // Center on first event or fallback to London
  const firstEvent = events.find(ev => ev.lat && ev.lon);
  const defaultCenter = firstEvent
    ? [parseFloat(firstEvent.lat), parseFloat(firstEvent.lon)]
    : [51.505, -0.09];

  useEffect(() => {
    if (!firstEvent) {
      console.log('📍 No coordinates available for map center.');
    }
  }, [events]);

  return (
    <div style={{ marginTop: '2rem', height: '400px' }}>
      <MapContainer center={defaultCenter} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {events
          .filter(ev => ev.lat && ev.lon)
          .map(ev => (
            <Marker key={ev.id} position={[parseFloat(ev.lat), parseFloat(ev.lon)]}>
              <Popup>
                <strong>{ev.name}</strong><br />
                {ev.description}<br />
                📍 {ev.location}<br />
                📅 {ev.date}
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}

export default MapView;
