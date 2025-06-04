import { useState, useEffect } from 'react';

function LocationSearch({ value, onSelect }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Location search failed:', err);
        }
      }
    };

    const delayDebounce = setTimeout(fetchData, 300);
    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (place) => {
    setQuery(place.display_name);
    setResults([]);
    setShowResults(false);
    onSelect(place);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Enter city name"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowResults(true);
        }}
        style={{
          width: '100%',
          padding: '0.5rem',
          fontSize: '1rem'
        }}
      />
      {showResults && results.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '100%',
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: '#fff',
          color: '#000',
          border: '1px solid #ccc',
          margin: 0,
          padding: 0,
          listStyle: 'none',
          zIndex: 9999
        }}>
          {results.map((place, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(place)}
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                borderBottom: '1px solid #eee'
              }}
            >
              {place.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LocationSearch;
