import React, { useState } from 'react';
import { fetchJson, setAuthToken } from '../../services/api';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await fetchJson('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (data.token) {
        setAuthToken(data.token);
        onLogin();
      } else {
        setError('Unexpected response from server');
      }
    } catch (err) {
      setError('Invalid password or server error');
    }
    
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-main)'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '300px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Performance HQ</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Secret Credential"
            style={{ width: '100%', padding: '10px', marginBottom: '15px' }}
            autoFocus
          />
          {error && <div style={{ color: 'var(--danger)', marginBottom: '15px', fontSize: '0.9rem' }}>{error}</div>}
          <button 
            type="submit" 
            className="primary-button" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
