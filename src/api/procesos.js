// API para el monitoreo de procesos background
import { fetchWithAuth } from './http';
const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '';
const BASE_URL = RAW_API_BASE.replace(/\/$/, '');

// Cache local de procesos
let procesosCache = [];
let procesoIdCounter = 1;
let pollingIntervals = {}; // Almacenar intervalos de polling por job_id

// Tipos de proceso disponibles (ahora incluye tests reales)
export const TIPOS_PROCESO = {
  FUSIONAR_DATOS: 'fusionar-datos',
  TEST_FUSION_QUICK_ASYNC: 'test-fusion-quick-async',
  TEST_FUSION_SLOW_ASYNC: 'test-fusion-slow-async',
};

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
    console.error('Error al obtener procesos:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Obtiene el historial/auditoría de ejecuciones de jobs
 * Endpoint: GET /api/jobs/audits
 * Parámetros soportados: createdBy, fechaInicio, jobType, jobId, page, pageSize
 */
export async function getJobAudits({ createdBy, fechaInicio, jobType, jobId, page = 1, pageSize = 10 } = {}) {
  try {
    const usp = new URLSearchParams();
    if (createdBy) usp.set('createdBy', createdBy);
    if (fechaInicio) usp.set('fechaInicio', fechaInicio);
    if (jobType) usp.set('jobType', jobType);
    if (jobId) usp.set('jobId', jobId);
    if (page) usp.set('page', String(page));
    if (pageSize) usp.set('pageSize', String(pageSize));

    const url = `${BASE_URL}/jobs/audits${usp.toString() ? `?${usp.toString()}` : ''}`;
    const response = await fetchWithAuth(url, { method: 'GET' });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al obtener auditorías:', response.status, errorText);
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
    console.error('Error al consultar auditorías:', error);
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
      const errorText = await response.text();
      console.error('Error al obtener logs del job:', response.status, errorText);
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
    console.error('Error al consultar logs del job:', error);
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
    
    nuevoProceso.logs.push(`${new Date().toISOString()}: Llamando a endpoint: ${tipoProceso.endpoint}`);
    
    const resultado = await llamarEndpointReal(tipoProceso, parametros);
    
    if (!resultado.ok) {
      nuevoProceso.estado = ESTADOS_PROCESO.ERROR;
      nuevoProceso.error = `Error al llamar al backend: ${resultado.error}`;
      nuevoProceso.logs.push(`${new Date().toISOString()}: ERROR - ${nuevoProceso.error}`);
      return { ok: true, data: nuevoProceso, message: 'Proceso iniciado pero falló al conectar con el backend' };
    }

    const jobId = resultado.data.job_id;
    nuevoProceso.jobId = jobId;
    nuevoProceso.logs.push(`${new Date().toISOString()}: Job asíncrono iniciado con ID: ${jobId}`);
    iniciarPollingJob(nuevoProceso, jobId);
    
    return { ok: true, data: nuevoProceso, message: 'Proceso iniciado correctamente' };
    
  } catch (error) {
    console.error('Error al iniciar proceso:', error);
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
      console.log('Cancelando job en backend:', url);
      
      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error al cancelar job:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Job cancelado:', data);

      // Detener el polling
      if (pollingIntervals[proceso.jobId]) {
        clearInterval(pollingIntervals[proceso.jobId]);
        delete pollingIntervals[proceso.jobId];
      }
    }
    
    proceso.estado = ESTADOS_PROCESO.CANCELADO;
    proceso.logs.push(`${new Date().toISOString()}: Proceso cancelado por usuario`);
    
    return { ok: true, data: proceso, message: 'Proceso cancelado correctamente' };
    
  } catch (error) {
    console.error('Error al cancelar proceso:', error);
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
    console.error('Error al eliminar proceso:', error);
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
    console.error('Error al obtener detalle del proceso:', error);
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
    console.error('Error al obtener estadísticas:', error);
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
    console.log('Llamando a backend (GET):', url);
  } else {
    body = { periodo: queryPeriodo };
    console.log('Llamando a backend (POST):', url, 'Body:', body);
  }
  
  try {
    const options = { method };
    if (method !== 'GET') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const response = await fetchWithAuth(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    console.error('Error calling backend:', error);
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
    console.error('Error consultando job:', error);
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
      proceso.logs.push(`${new Date().toISOString()}: ERROR - ${proceso.error}`);
      clearInterval(pollingIntervals[jobId]);
      delete pollingIntervals[jobId];
      return;
    }
    
    const jobData = result.data;
    
    console.log(`[Polling] Job ${jobId} - Status: ${jobData.status}, Progress: ${jobData.progress_percentage}%`);
    
    // Actualizar progreso y tiempo
    proceso.progreso = Math.round(jobData.progress_percentage || 0);
    proceso.tiempoTranscurrido = Math.floor((new Date() - new Date(proceso.fechaInicio)) / 1000);
    
    // Mapear status numérico a estados
    // 0=Pending, 1=Running, 2=Completed, 3=Failed, 4=Cancelled
    const status = jobData.status;
    
    if (status === 2) { // Completed
      proceso.estado = ESTADOS_PROCESO.COMPLETADO;
      proceso.progreso = 100;
      proceso.logs.push(`${new Date().toISOString()}: Proceso completado exitosamente`);
      if (jobData.result) {
        proceso.resultado = jobData.result;
        if (jobData.result.mensaje) {
          proceso.logs.push(`${new Date().toISOString()}: ${jobData.result.mensaje}`);
        }
        if (jobData.result.duracion_segundos !== undefined) {
          proceso.logs.push(`${new Date().toISOString()}: Duración: ${jobData.result.duracion_segundos}s`);
        }
        if (jobData.result.registros_procesados !== undefined) {
          proceso.logs.push(`${new Date().toISOString()}: Registros procesados: ${jobData.result.registros_procesados}`);
        }
      }
      clearInterval(pollingIntervals[jobId]);
      delete pollingIntervals[jobId];
    } else if (status === 3) { // Failed
      proceso.estado = ESTADOS_PROCESO.ERROR;
      proceso.error = jobData.error_message || jobData.result?.mensaje || 'Error desconocido';
      proceso.logs.push(`${new Date().toISOString()}: ERROR - ${proceso.error}`);
      clearInterval(pollingIntervals[jobId]);
      delete pollingIntervals[jobId];
    } else if (status === 4) { // Cancelled
      proceso.estado = ESTADOS_PROCESO.CANCELADO;
      proceso.logs.push(`${new Date().toISOString()}: Proceso cancelado`);
      clearInterval(pollingIntervals[jobId]);
      delete pollingIntervals[jobId];
    } else if (status === 1) { // Running
      proceso.estado = ESTADOS_PROCESO.EJECUTANDO;
      if (jobData.status_message) {
        const lastLog = proceso.logs[proceso.logs.length - 1];
        const mensajeYaRegistrado = lastLog && lastLog.includes(jobData.status_message);
        if (!mensajeYaRegistrado) {
          proceso.logs.push(`${new Date().toISOString()}: ${jobData.status_message} - ${proceso.progreso}% completado`);
        }
      }
    } else if (status === 0) { // Pending
      proceso.estado = ESTADOS_PROCESO.PENDIENTE;
      const lastLog = proceso.logs[proceso.logs.length - 1];
      if (!lastLog || !lastLog.includes('Esperando en cola')) {
        proceso.logs.push(`${new Date().toISOString()}: Esperando en cola...`);
      }
    }
    
    // Forzar actualización del array para que Vue detecte los cambios
    const index = procesosCache.findIndex(p => p.id === proceso.id);
    if (index !== -1) {
      procesosCache[index] = { ...proceso };
    }
  }, 2000); // Polling cada 2 segundos
}
