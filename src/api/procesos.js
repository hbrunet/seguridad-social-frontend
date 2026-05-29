// API para el monitoreo de procesos background
import { fetchWithAuth } from './http';
import { formatPeriodo } from '../utils/formatDate';
const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '';
const BASE_URL = RAW_API_BASE.replace(/\/$/, '');

// Cache local de procesos
let procesosCache = [];
let procesoIdCounter = 1;
let pollingIntervals = {}; // Almacenar intervalos de polling por job_id

function addLog(proceso, mensaje) {
  const last = proceso.logs[proceso.logs.length - 1];
  if (last && last.slice(last.indexOf(': ') + 2) === mensaje) return;
  proceso.logs.push(`${new Date().toISOString()}: ${mensaje}`);
}

// Tipos de proceso disponibles (ahora incluye tests reales)
export const TIPOS_PROCESO = {
  FUSIONAR_DATOS: 'fusionar-datos',
  TEST_FUSION_QUICK_ASYNC: 'test-fusion-quick-async',
  TEST_FUSION_SLOW_ASYNC: 'test-fusion-slow-async',
};

// Nombres de tipos de proceso que generan un archivo descargable al completarse
export const TIPOS_CON_DESCARGA = ['Exportar Presentación'];

// Estados de proceso
export const ESTADOS_PROCESO = {
  PENDIENTE: 'Pendiente',
  EJECUTANDO: 'Ejecutando',
  PAUSADO: 'Pausado',
  COMPLETADO: 'Completado',
  ERROR: 'Error',
  CANCELADO: 'Cancelado'
};

/**
 * Obtiene la lista de todos los procesos
 */
export async function getProcesos(filtros = {}) {
  try {
    // Devolver procesos del cache local
    let procesosFiltered = [...procesosCache];
    
    // Aplicar filtros si existen
    if (filtros.estado) {
      procesosFiltered = procesosFiltered.filter(p => p.estado === filtros.estado);
    }
    
    if (filtros.tipo) {
      procesosFiltered = procesosFiltered.filter(p => p.tipo === filtros.tipo);
    }
    
    // Ordenar por fecha de inicio (más recientes primero)
    procesosFiltered.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
    
    return {
      ok: true,
      data: {
        procesos: procesosFiltered,
        total: procesosFiltered.length
      }
    };
    
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Obtiene el historial/auditoría de ejecuciones de jobs
 * Endpoint: GET /api/jobs/audits
 * Parámetros soportados: createdBy, fechaInicio, jobType, jobId, page, pageSize
 */
export async function getJobAudits({ createdBy, fechaInicio, jobType, jobId, periodo, page = 1, pageSize = 10 } = {}) {
  try {
    const usp = new URLSearchParams();
    if (createdBy) usp.set('createdBy', createdBy);
    if (fechaInicio) usp.set('fechaInicio', fechaInicio);
    if (jobType) usp.set('jobType', jobType);
    if (jobId) usp.set('jobId', jobId);
    if (periodo) usp.set('periodo', periodo);
    if (page) usp.set('page', String(page));
    if (pageSize) usp.set('pageSize', String(pageSize));

    const url = `${BASE_URL}/jobs/audits${usp.toString() ? `?${usp.toString()}` : ''}`;
    const response = await fetchWithAuth(url, { method: 'GET' });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const raw = await response.json();

    return {
      ok: true,
      data: {
        items: raw.audits,
        total: raw.total_registros,
        page,
        pageSize
      }
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Obtiene los logs de un job
 * Endpoint: GET /api/jobs/{jobId}/logs
 */
export async function getJobLogs(jobId) {
  try {
    if (!jobId) {
      return { ok: false, error: 'JobId no válido' };
    }

    const url = `${BASE_URL}/jobs/${jobId}/logs`;
    const response = await fetchWithAuth(url, { method: 'GET' });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const raw = await response.json();
    let items = [];

    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw?.items) {
      items = raw.items;
    } else if (raw?.logs) {
      items = raw.logs;
    } else if (raw?.data?.items) {
      items = raw.data.items;
    } else if (raw?.data?.logs) {
      items = raw.data.logs;
    } else if (raw?.data && Array.isArray(raw.data)) {
      items = raw.data;
    } else if (raw) {
      items = [raw];
    }

    return {
      ok: true,
      data: { items }
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Inicia un nuevo proceso
 */
export async function iniciarProceso(tipoProceso, parametros = {}) {
  try {
    if (!tipoProceso) {
      return { ok: false, error: 'Tipo de proceso no válido' };
    }
    
    const nuevoProceso = {
      id: procesoIdCounter++,
      nombre: `${tipoProceso.name} #${procesoIdCounter - 1}`,
      periodo: formatPeriodo(`${parametros.periodo}-01T00:00:00`) || null,
      tipo: tipoProceso.name,
      tipoProceso: tipoProceso,
      estado: ESTADOS_PROCESO.EJECUTANDO,
      progreso: 0,
      fechaInicio: new Date(),
      tiempoTranscurrido: 0,
      error: null,
      parametros: parametros,
      logs: [`${new Date().toISOString()}: Proceso iniciado`]
    };
    
    procesosCache.push(nuevoProceso);
    
    addLog(nuevoProceso, `Llamando a endpoint: ${tipoProceso.endpoint}`);
    
    const resultado = await llamarEndpointReal(tipoProceso, parametros);
    
    if (!resultado.ok) {
      nuevoProceso.estado = ESTADOS_PROCESO.ERROR;
      nuevoProceso.error = `Error al llamar al backend: ${resultado.error}`;
      addLog(nuevoProceso, `ERROR - ${nuevoProceso.error}`);
      return { ok: true, data: nuevoProceso, message: 'Proceso iniciado pero falló al conectar con el backend' };
    }

    const jobId = resultado.data.job_id;
    nuevoProceso.jobId = jobId;
    addLog(nuevoProceso, `Job asíncrono iniciado con ID: ${jobId}`);
    iniciarPollingJob(nuevoProceso, jobId);
    
    return { ok: true, data: nuevoProceso, message: 'Proceso iniciado correctamente' };
    
  } catch (error) {
    return { ok: false, error: 'Error al iniciar el proceso' };
  }
}

/**
 * Cancela un proceso (cancela el job en el backend)
 */
export async function cancelarProceso(procesoId) {
  try {
    const proceso = procesosCache.find(p => p.id === procesoId);
    if (!proceso) {
      return { ok: false, error: 'Proceso no encontrado' };
    }
    
    if (proceso.estado !== ESTADOS_PROCESO.EJECUTANDO) {
      return { ok: false, error: 'El proceso no se puede cancelar en su estado actual' };
    }

    // Si el proceso tiene un job_id, cancelarlo en el backend
    if (proceso.jobId) {
      const url = `${BASE_URL}/jobs/${proceso.jobId}/cancel`;
      
      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Detener el polling
      if (pollingIntervals[proceso.jobId]) {
        clearInterval(pollingIntervals[proceso.jobId]);
        delete pollingIntervals[proceso.jobId];
      }
    }
    
    proceso.estado = ESTADOS_PROCESO.CANCELADO;
    addLog(proceso, 'Proceso cancelado por usuario');
    
    return { ok: true, data: proceso, message: 'Proceso cancelado correctamente' };
    
  } catch (error) {
    return { ok: false, error: `Error al cancelar el proceso: ${error.message}` };
  }
}

/**
 * Elimina un proceso terminado
 */
export async function eliminarProceso(procesoId) {
  try {
    const index = procesosCache.findIndex(p => p.id === procesoId);
    if (index === -1) {
      return { ok: false, error: 'Proceso no encontrado' };
    }
    
    const proceso = procesosCache[index];
    if (proceso.estado === ESTADOS_PROCESO.EJECUTANDO) {
      return { ok: false, error: 'No se puede eliminar un proceso en ejecución' };
    }
    
    procesosCache.splice(index, 1);
    
    return { ok: true, data: { id: procesoId }, message: 'Proceso eliminado correctamente' };
    
  } catch (error) {
    return { ok: false, error: 'Error al eliminar el proceso' };
  }
}

/**
 * Obtiene los detalles completos de un proceso
 */
export async function getDetalleProceso(procesoId) {
  try {
    const proceso = procesosCache.find(p => p.id === procesoId);
    if (!proceso) {
      return { ok: false, error: 'Proceso no encontrado' };
    }
    
    return { ok: true, data: proceso };
    
  } catch (error) {
    return { ok: false, error: 'Error al obtener los detalles del proceso' };
  }
}

/**
 * Obtiene estadísticas generales del sistema
 */
export async function getEstadisticasProcesos() {
  try {
    return {
      ok: true,
      data: {
        total: procesosCache.length,
        ejecutando: procesosCache.filter(p => p.estado === ESTADOS_PROCESO.EJECUTANDO).length,
        completados: procesosCache.filter(p => p.estado === ESTADOS_PROCESO.COMPLETADO).length,
        errores: procesosCache.filter(p => p.estado === ESTADOS_PROCESO.ERROR).length,
        cancelados: procesosCache.filter(p => p.estado === ESTADOS_PROCESO.CANCELADO).length
      }
    };
    
  } catch (error) {
    return { ok: false, error: 'Error al obtener estadísticas del sistema' };
  }
}

/**
 * Llama a un endpoint real del backend
 */
async function llamarEndpointReal(tipoProceso, parametros) {
  let url = `${BASE_URL}${tipoProceso.endpoint}`;
  const method = (tipoProceso.method || 'POST').toUpperCase();
  
  // Formatear el período correctamente
  let periodoFormateado = parametros.periodo;
  if (periodoFormateado && periodoFormateado.length === 7) {
    // Si es formato YYYY-MM, convertir a YYYY-MM-01T00:00:00
    periodoFormateado = `${periodoFormateado}-01T00:00:00`;
  }
  
  const queryPeriodo = periodoFormateado || new Date().toISOString();
  let body = null;
  
  if (method === 'GET') {
    const usp = new URLSearchParams({ periodo: queryPeriodo });
    url = `${url}?${usp.toString()}`;
  } else {
    body = { periodo: queryPeriodo };
  }
  
  try {
    const options = { method };
    if (method !== 'GET') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const response = await fetchWithAuth(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Consulta el estado de un job asíncrono
 */
async function consultarEstadoJob(jobId) {
  const url = `${BASE_URL}/jobs/${jobId}`;
  
  try {
    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Descarga el archivo resultado de un job completado.
 * Endpoint: GET /api/jobs/{jobId}/download
 * Soporta respuesta blob (descarga directa) o JSON con URL firmada.
 */
export async function descargarResultado(jobId) {
  try {
    const url = `${BASE_URL}/ddjj/exportar-presentacion/${jobId}/archivo`;
    const response = await fetchWithAuth(url, { method: 'GET' });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('Content-Type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      const downloadUrl = data.url || data.download_url || data.file_url;
      if (downloadUrl) {
        return { ok: true, type: 'url', url: downloadUrl, filename: data.filename || data.nombre || null };
      }
      return { ok: false, error: 'La respuesta no contiene URL de descarga' };
    }

    // Respuesta binaria: extraer nombre del header Content-Disposition
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]*)\1/i);
    const filename = match ? match[2] : `resultado_${jobId}`;

    return { ok: true, type: 'blob', blob, filename };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Inicia polling para un job asíncrono
 */
function iniciarPollingJob(proceso, jobId) {
  // Limpiar polling anterior si existe
  if (pollingIntervals[jobId]) {
    clearInterval(pollingIntervals[jobId]);
  }
  
  pollingIntervals[jobId] = setInterval(async () => {
    const result = await consultarEstadoJob(jobId);
    
    if (!result.ok) {
      proceso.estado = ESTADOS_PROCESO.ERROR;
      proceso.error = `Error al consultar estado: ${result.error}`;
      addLog(proceso, `ERROR - ${proceso.error}`);
      clearInterval(pollingIntervals[jobId]);
      delete pollingIntervals[jobId];
      return;
    }
    
    const jobData = result.data;
    

    
    // Actualizar progreso y tiempo
    proceso.progreso = Math.round(jobData.progress_percentage || 0);
    proceso.tiempoTranscurrido = Math.floor((new Date() - new Date(proceso.fechaInicio)) / 1000);
    
    // Mapear status numérico a estados
    // 0=Pending, 1=Running, 2=Completed, 3=Failed, 4=Cancelled
    const status = jobData.status;
    
    if (status === 2) { // Completed
      proceso.estado = ESTADOS_PROCESO.COMPLETADO;
      proceso.progreso = 100;
      addLog(proceso, 'Proceso completado exitosamente');
      if (jobData.result) {
        proceso.resultado = jobData.result;
        if (jobData.result.mensaje) {
          addLog(proceso, jobData.result.mensaje);
        }
        if (jobData.result.duracion_segundos !== undefined) {
          addLog(proceso, `Duración: ${jobData.result.duracion_segundos}s`);
        }
        if (jobData.result.registros_procesados !== undefined) {
          addLog(proceso, `Registros procesados: ${jobData.result.registros_procesados}`);
        }
      }
      clearInterval(pollingIntervals[jobId]);
      delete pollingIntervals[jobId];
    } else if (status === 3) { // Failed
      proceso.estado = ESTADOS_PROCESO.ERROR;
      proceso.error = jobData.error_message || jobData.result?.mensaje || 'Error desconocido';
      addLog(proceso, `ERROR - ${proceso.error}`);
      clearInterval(pollingIntervals[jobId]);
      delete pollingIntervals[jobId];
    } else if (status === 4) { // Cancelled
      proceso.estado = ESTADOS_PROCESO.CANCELADO;
      addLog(proceso, 'Proceso cancelado');
      clearInterval(pollingIntervals[jobId]);
      delete pollingIntervals[jobId];
    } else if (status === 1) { // Running
      proceso.estado = ESTADOS_PROCESO.EJECUTANDO;
      if (jobData.status_message) {
        addLog(proceso, `${jobData.status_message} - ${proceso.progreso}% completado`);
      }
    } else if (status === 0) { // Pending
      proceso.estado = ESTADOS_PROCESO.PENDIENTE;
      addLog(proceso, 'Esperando en cola...');
    }
    
    // Forzar actualización del array para que Vue detecte los cambios
    const index = procesosCache.findIndex(p => p.id === proceso.id);
    if (index !== -1) {
      procesosCache[index] = { ...proceso };
    }
  }, 2000); // Polling cada 2 segundos
}
