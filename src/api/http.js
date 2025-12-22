// Centralized fetch wrapper that injects auth token and handles 401
import { handleUnauthorized } from './auth';

export async function fetchWithAuth(url, options = {}) {
  const opts = { ...options };
  const headers = new Headers(opts.headers || {});

  // Add Content-Type for requests with body when not explicitly provided
  if (!headers.has('Content-Type') && opts.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Authorization header if not present
  const token = localStorage.getItem('authToken');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  opts.headers = headers;

  const response = await fetch(url, opts);

  // On 401, clear session and redirect to login
  if (response.status === 401) {
    try {
      const clone = response.clone();
      let data = null;
      try { data = await clone.json(); } catch (e) {}
      const message = data?.mensaje || data?.message || data?.error || 'Sesión expirada. Por favor, inicie sesión nuevamente.';
      handleUnauthorized(message);
    } catch (e) {
      handleUnauthorized('Sesión expirada. Por favor, inicie sesión nuevamente.');
    }
  }

  return response;
}
