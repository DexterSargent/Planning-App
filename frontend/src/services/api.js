export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return response.status === 204 ? null : response.json();
}
