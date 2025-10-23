// Small API wrapper for novedades endpoints
// Use VITE_API_BASE if provided (e.g. https://localhost:5001) otherwise use relative paths
const API_BASE = import.meta.env.VITE_API_BASE || '';
const UPLOAD_URL = (API_BASE ? API_BASE.replace(/\/$/, '') : '') + '/api/novedades/upload';
const CREAR_HOJA_URL = (API_BASE ? API_BASE.replace(/\/$/, '') : '') + '/api/novedades/crear-hoja';
const LISTADO_HOJAS_URL = (API_BASE ? API_BASE.replace(/\/$/, '') : '') + '/api/novedades/listado-hojas';

// Obtener listado de hojas con filtros
export async function getHojas({ nroHoja, periodo, estado, reparticion, page, pageSize, sort, order } = {}) {
  let url = LISTADO_HOJAS_URL;
  const params = [];
  if (nroHoja) params.push(`nroHoja=${encodeURIComponent(nroHoja)}`);
  if (periodo) params.push(`periodo=${encodeURIComponent(periodo)}`);
  if (estado) params.push(`estado=${encodeURIComponent(estado)}`);
  if (reparticion) params.push(`idRep=${encodeURIComponent(reparticion)}`);
  if (page) params.push(`page=${encodeURIComponent(page)}`);
  if (pageSize) params.push(`pageSize=${encodeURIComponent(pageSize)}`);
  if (sort) params.push(`sort=${encodeURIComponent(sort)}`);
  if (order) params.push(`order=${encodeURIComponent(order)}`);
  if (params.length) url += '?' + params.join('&');
  const resp = await fetch(url);
  let data = null;
  try { data = await resp.json(); } catch(e) {}
  return { ok: resp.ok, status: resp.status, data, message: data?.mensaje || data?.message || data?.error || null };
}

function normalizeXhrResponse(xhr) {
  // xhr.response is expected to be parsed JSON when responseType='json'
  const resp = xhr.response || {};
  return {
    ok: xhr.status >= 200 && xhr.status < 300,
    status: xhr.status,
    data: resp,
    message: resp.mensaje || resp.message || resp.error || null,
    code: resp.error_ora || resp.code || null
  };
}

export function uploadFileWithProgress(formData, baseUrl) {
  const url = baseUrl || UPLOAD_URL;
  // debug log removed
  return new Promise((resolve, reject) => {
    const xhr = new window.XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.onload = () => {
      resolve(normalizeXhrResponse(xhr));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

async function normalizeFetchResponse(response) {
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // ignore parse error
  }
  return {
    ok: response.ok,
    status: response.status,
    data,
    message: data?.mensaje || data?.message || data?.error || null,
    code: data?.error_ora || data?.code || null
  };
}

export async function crearHoja(body, baseUrl) {
  const url = baseUrl || CREAR_HOJA_URL;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return normalizeFetchResponse(resp);
}
