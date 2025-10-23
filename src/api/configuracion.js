// API helper for configuration endpoints
const API_BASE = import.meta.env.VITE_API_BASE || '';
const GET_REPARTICIONES = (API_BASE ? API_BASE.replace(/\/$/, '') : '') + '/api/configuracion/reparticiones-seg-social';
const GET_TIPOS_LIQUIDACION = (API_BASE ? API_BASE.replace(/\/$/, '') : '') + '/api/configuracion/tipos-liquidacion';
const GET_ESTADOS_HOJA = (API_BASE ? API_BASE.replace(/\/$/, '') : '') + '/api/configuracion/estados-hoja';

async function normalizeFetchResponse(response) {
  let data = null;
  try { data = await response.json(); } catch(e) {}
  return { ok: response.ok, status: response.status, data, message: data?.mensaje || data?.message || data?.error || null };
}

export async function getReparticiones(baseUrl) {
  const url = baseUrl || GET_REPARTICIONES;
  const resp = await fetch(url);
  return normalizeFetchResponse(resp);
}

export async function getTiposLiquidacion(baseUrl) {
  const url = baseUrl || GET_TIPOS_LIQUIDACION;
  const resp = await fetch(url);
  return normalizeFetchResponse(resp);
}

export async function getEstadosHoja(baseUrl) {
  const url = baseUrl || GET_ESTADOS_HOJA;
  const resp = await fetch(url);
  return normalizeFetchResponse(resp);
}
