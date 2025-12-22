// API helper for authentication endpoints
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';
const LOGIN_URL = (API_BASE.replace(/\/$/, '')) + '/api/auth/login';

async function normalizeFetchResponse(response) {
  let data = null;
  try { data = await response.json(); } catch(e) {}
  return { ok: response.ok, status: response.status, data, message: data?.mensaje || data?.message || data?.error || null };
}

export async function login(userName, password, applicationId = 9) {
  try {
    const resp = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_name: `h_${userName}`,
        password: password,
        application_id: applicationId
      })
    });
    
    const result = await normalizeFetchResponse(resp);
    
    // Si el login es exitoso, guardar el token en localStorage
    // La API devuelve el token en result.data.data.token
    const token = result.data?.data?.token || result.data?.token;
    if (result.ok && token) {
      console.log('Guardando token en localStorage:', token);
      localStorage.setItem('authToken', token);
      localStorage.setItem('userName', userName);
    } else {
      console.log('No se encontró token en la respuesta:', result.data);
    }
    
    return result;
  } catch (error) {
    return { ok: false, status: 500, data: null, message: 'Error de conexión' };
  }
}

export async function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userName');
}

export function isAuthenticated() {
  return !!localStorage.getItem('authToken');
}

export function getAuthToken() {
  return localStorage.getItem('authToken');
}

export function getUserName() {
  return localStorage.getItem('userName');
}

// Manejo centralizado de 401/expiración de sesión
export function handleUnauthorized(message = 'Sesión expirada. Por favor, inicie sesión nuevamente.') {
  try {
    localStorage.setItem('sessionExpired', '1');
    localStorage.setItem('sessionExpiredMessage', message);
  } catch (e) {}
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
  } catch (e) {}

  // Evitar bucle si ya estamos en /login
  if (typeof window !== 'undefined') {
    const isOnLogin = window.location.pathname === '/login';
    if (!isOnLogin) {
      // Incluir flag en query para mostrar mensaje
      window.location.href = '/login?expired=1';
    }
  }
}
