// API para el monitoreo de procesos background
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

// Configuración de tipos de proceso
export const configuracionProcesos = {
  // Nuevas configuraciones para tests reales
  [TIPOS_PROCESO.FUSIONAR_DATOS]: {
    nombre: 'Fusión de Datos',
    duracion: 600000, // 10 minutos
    descripcion: 'Proceso de fusión de datos en el sistema backend',
    endpoint: '/ddjj/fusionar-datos',
    isAsync: true
  },
  [TIPOS_PROCESO.TEST_FUSION_QUICK_ASYNC]: {
    nombre: 'Test Fusión Rápido (Asíncrono)',
    duracion: 30000, // 30 segundos
    descripcion: 'Test rápido asíncrono con progreso - 30 segundos',
    endpoint: '/testing/fusion-quick-async',
    isAsync: true
  },
  [TIPOS_PROCESO.TEST_FUSION_SLOW_ASYNC]: {
    nombre: 'Test Fusión Lento (Asíncrono)',
    duracion: 120000, // 2 minutos
    descripcion: 'Test lento asíncrono simula proceso real - 2 minutos',
    endpoint: '/testing/fusion-slow-async',
    isAsync: true
  }
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
 * Inicia un nuevo proceso
 */
export async function iniciarProceso(tipoProceso, parametros = {}) {
  try {
    const config = configuracionProcesos[tipoProceso];
    if (!config) {
      return { ok: false, error: 'Tipo de proceso no válido' };
    }
    
    const nuevoProceso = {
      id: procesoIdCounter++,
      nombre: `${config.nombre} #${procesoIdCounter - 1}`,
      tipo: config.nombre,
      tipoProceso: tipoProceso,
      estado: ESTADOS_PROCESO.EJECUTANDO,
      progreso: 0,
      fechaInicio: new Date(),
      tiempoTranscurrido: 0,
      duracionEstimada: config.duracion,
      descripcion: parametros.descripcion || config.descripcion,
      error: null,
      parametros: parametros,
      logs: [`${new Date().toISOString()}: Proceso iniciado`]
    };
    
    procesosCache.push(nuevoProceso);
    
    nuevoProceso.logs.push(`${new Date().toISOString()}: Llamando a endpoint: ${config.endpoint}`);
    
    const resultado = await llamarEndpointReal(config, parametros);
    
    if (!resultado.ok) {
      nuevoProceso.estado = ESTADOS_PROCESO.ERROR;
      nuevoProceso.error = `Error al llamar al backend: ${resultado.error}`;
      nuevoProceso.logs.push(`${new Date().toISOString()}: ERROR - ${nuevoProceso.error}`);
      return { ok: true, data: nuevoProceso, message: 'Proceso iniciado pero falló al conectar con el backend' };
    }
    
    // Si es asíncrono, iniciar polling
    if (config.isAsync) {
      const jobId = resultado.data.job_id;
      nuevoProceso.jobId = jobId;
      nuevoProceso.logs.push(`${new Date().toISOString()}: Job asíncrono iniciado con ID: ${jobId}`);
      iniciarPollingJob(nuevoProceso, jobId);
    } else {
      // Si es síncrono, el proceso ya terminó
      nuevoProceso.estado = ESTADOS_PROCESO.COMPLETADO;
      nuevoProceso.progreso = 100;
      nuevoProceso.resultado = resultado.data;
      nuevoProceso.logs.push(`${new Date().toISOString()}: Proceso completado exitosamente`);
      nuevoProceso.logs.push(`${new Date().toISOString()}: Duración: ${resultado.data.duracion_segundos}s`);
    }
    
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
      
      const response = await fetch(url, {
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
    const index = procesosCache.findIndex(p => p.id === procesoId);
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
async function llamarEndpointReal(config, parametros) {
  const url = `${BASE_URL}${config.endpoint}`;
  
  // Formatear el período correctamente
  let periodoFormateado = parametros.periodo;
  if (periodoFormateado && periodoFormateado.length === 7) {
    // Si es formato YYYY-MM, convertir a YYYY-MM-01T00:00:00
    periodoFormateado = `${periodoFormateado}-01T00:00:00`;
  }
  
  const body = {
    periodo: periodoFormateado || new Date().toISOString()
  };
  
  console.log('Llamando a backend:', url, 'Body:', body);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
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
    const response = await fetch(url, {
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
