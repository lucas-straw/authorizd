// In production (Vercel), set VITE_API_URL to your Railway API URL.
// In dev, Vite proxies /api → localhost:3001 automatically.
const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('authorizd_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// Auth
export const register = (email, password, shop_name) =>
  request('POST', '/merchants/register', { email, password, shop_name });

export const login = (email, password) =>
  request('POST', '/merchants/login', { email, password });

// Merchant
export const getMe = () =>
  request('GET', '/merchants/me');

export const updateConfig = (updates) =>
  request('PUT', '/merchants/me/config', updates);

export const rotateKey = () =>
  request('POST', '/merchants/me/rotate-key');

// Analytics
export const getSummary = () =>
  request('GET', '/analytics/summary');

export const getEvents = (limit = 50, offset = 0) =>
  request('GET', `/analytics/events?limit=${limit}&offset=${offset}`);
