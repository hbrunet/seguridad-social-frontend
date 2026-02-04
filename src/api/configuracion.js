// API helper for configuration endpoints
import { getAuthToken } from './auth';
import { fetchWithAuth } from './http';

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '';
const API_BASE = RAW_API_BASE.replace(/\/$/, '');
const GET_REPARTICIONES = `${API_BASE}/configuracion/reparticiones-seg-social`;
const GET_TIPOS_LIQUIDACION = `${API_BASE}/configuracion/tipos-liquidacion`;
const GET_ESTADOS_HOJA = `${API_BASE}/configuracion/estados-hoja`;
const GET_JOB_TYPES = `${API_BASE}/configuracion/job-types`;

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

export async function getJobTypes(baseUrl) {
  const url = baseUrl || GET_JOB_TYPES;
  const resp = await fetchWithAuth(url, { headers: getHeaders() });
  return normalizeFetchResponse(resp);
}
