import React, { useState, useEffect, useRef } from 'react';

export default function GeoapifyAutocomplete({ value, onSelect, placeholder }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  const fetchSuggestions = async (text) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      return;
    }
    const apiKey = process.env.REACT_APP_GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.warn("Geoapify API key missing!");
      return;
    }
    try {
      const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&apiKey=${apiKey}`);
      const data = await res.json();
      if (data.features) {
        setSuggestions(data.features);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (inputValue !== value) {
        fetchSuggestions(inputValue);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [inputValue, value]);

  const handleSelect = (feature) => {
    const address = feature.properties.formatted;
    const lat = feature.properties.lat;
    const lon = feature.properties.lon;
    setInputValue(address);
    setIsOpen(false);
    onSelect(address, lat, lon);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={inputValue}
        placeholder={placeholder}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        style={{ width: '100%' }}
      />
      {isOpen && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(s)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                color: 'var(--text)'
              }}
            >
              {s.properties.formatted}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
