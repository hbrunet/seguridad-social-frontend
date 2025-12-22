// API helper for configuration endpoints
import { getAuthToken } from './auth';
import { fetchWithAuth } from './http';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';
const GET_REPARTICIONES = (API_BASE.replace(/\/$/, '')) + '/api/configuracion/reparticiones-seg-social';
const GET_TIPOS_LIQUIDACION = (API_BASE.replace(/\/$/, '')) + '/api/configuracion/tipos-liquidacion';
const GET_ESTADOS_HOJA = (API_BASE.replace(/\/$/, '')) + '/api/configuracion/estados-hoja';

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function normalizeFetchResponse(response) {
  let data = null;
  try { data = await response.json(); } catch(e) {}
  return { ok: response.ok, status: response.status, data, message: data?.mensaje || data?.message || data?.error || null };
}

export async function getReparticiones(baseUrl) {
  const url = baseUrl || GET_REPARTICIONES;
  const resp = await fetchWithAuth(url, { headers: getHeaders() });
  return normalizeFetchResponse(resp);
}

export async function getTiposLiquidacion(baseUrl) {
  const url = baseUrl || GET_TIPOS_LIQUIDACION;
  const resp = await fetchWithAuth(url, { headers: getHeaders() });
  return normalizeFetchResponse(resp);
}

export async function getEstadosHoja(baseUrl) {
  const url = baseUrl || GET_ESTADOS_HOJA;
  const resp = await fetchWithAuth(url, { headers: getHeaders() });
  return normalizeFetchResponse(resp);
}
