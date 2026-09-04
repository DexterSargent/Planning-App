export const API_URL = process.env.REACT_APP_API_URL || '/api';

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export async function fetchJson(path, options = {}) {
  const headers = { ...options.headers };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  
  if (response.status === 401 && path !== '/auth/login') {
    setAuthToken(null);
    window.location.reload();
  }
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return response.status === 204 ? null : response.json();
}

export async function toggleIngredientInventory(id, in_inventory) {
  return fetchJson(`/ingredients/${id}/inventory`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ in_inventory }),
  });
}

export async function getSettings() {
  return fetchJson('/settings');
}

export async function updateSettings(settings) {
  return fetchJson('/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });
}

export async function createGroceryList(week_label, items_json) {
  return fetchJson('/grocery-lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week_label, items_json }),
  });
}

export async function getActiveGroceryList() {
  return fetchJson('/grocery-lists/active');
}

export async function getAllGroceryLists() {
  return fetchJson('/grocery-lists');
}

export async function updateGroceryList(id, data) {
  return fetchJson(`/grocery-lists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteGroceryList(id) {
  return fetchJson(`/grocery-lists/${id}`, {
    method: 'DELETE',
  });
}

export async function estimateCommute(origin, destination) {
  return fetchJson('/commute/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination }),
  });
}

