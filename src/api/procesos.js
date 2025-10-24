// API simulada para el monitoreo de procesos background
const BASE_URL = 'http://localhost:8000/api'; // Cambiar por la URL real de tu backend

// Simulación de datos mientras no tengamos backend real
let procesosSimulados = [];
let procesoIdCounter = 1;

// Tipos de proceso disponibles
export const TIPOS_PROCESO = {
  IMPORTACION: 'importacion',
  VALIDACION: 'validacion', 
  CALCULO: 'calculo',
  REPORTE: 'reporte',
  BACKUP: 'backup'
};

// Estados de proceso
export const ESTADOS_PROCESO = {
  EJECUTANDO: 'Ejecutando',
  PAUSADO: 'Pausado',
  COMPLETADO: 'Completado',
  ERROR: 'Error',
  DETENIDO: 'Detenido'
};

// Configuración de tipos de proceso
export const configuracionProcesos = {
  [TIPOS_PROCESO.IMPORTACION]: {
    nombre: 'Importación de Datos',
    duracion: 30000, // 30 segundos
    descripcion: 'Importa archivos de novedades y los procesa'
  },
  [TIPOS_PROCESO.VALIDACION]: {
    nombre: 'Validación de Hojas',
    duracion: 15000, // 15 segundos
    descripcion: 'Valida la integridad de las hojas de liquidación'
  },
  [TIPOS_PROCESO.CALCULO]: {
    nombre: 'Cálculo de Liquidación',
    duracion: 45000, // 45 segundos
    descripcion: 'Ejecuta los cálculos de liquidación de haberes'
  },
  [TIPOS_PROCESO.REPORTE]: {
    nombre: 'Generación de Reportes',
    duracion: 20000, // 20 segundos
    descripcion: 'Genera reportes estadísticos y de control'
  },
  [TIPOS_PROCESO.BACKUP]: {
    nombre: 'Backup de Sistema',
    duracion: 60000, // 60 segundos
    descripcion: 'Realiza backup completo de la base de datos'
  }
};

// Función helper para simular delay de red
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función helper para respuesta simulada
const crearRespuesta = (data, ok = true, message = '') => ({
  ok,
  data,
  message
});

/**
 * Obtiene la lista de todos los procesos
 */
export async function getProcesos(filtros = {}) {
  await delay(300); // Simular latencia de red
  
  try {
    let procesosFiltered = [...procesosSimulados];
    
    // Aplicar filtros si existen
    if (filtros.estado) {
      procesosFiltered = procesosFiltered.filter(p => p.estado === filtros.estado);
    }
    
    if (filtros.tipo) {
      procesosFiltered = procesosFiltered.filter(p => p.tipo === filtros.tipo);
    }
    
    // Ordenar por fecha de inicio (más recientes primero)
    procesosFiltered.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
    
    return crearRespuesta({
      procesos: procesosFiltered,
      total: procesosFiltered.length,
      estadisticas: calcularEstadisticas(procesosFiltered)
    });
    
  } catch (error) {
    console.error('Error al obtener procesos:', error);
    return crearRespuesta(null, false, 'Error al obtener la lista de procesos');
  }
}

/**
 * Inicia un nuevo proceso
 */
export async function iniciarProceso(tipoProceso, parametros = {}) {
  await delay(500); // Simular procesamiento
  
  try {
    const config = configuracionProcesos[tipoProceso];
    if (!config) {
      return crearRespuesta(null, false, 'Tipo de proceso no válido');
    }
    
    const nuevoProceso = {
      id: procesoIdCounter++,
      nombre: `${config.nombre} #${procesoIdCounter - 1}`,
      tipo: config.nombre,
      tipoProceso: tipoProceso,
      estado: ESTADOS_PROCESO.EJECUTANDO,
      progreso: 0,
      cpu: Math.random() * 30 + 10,
      memoria: Math.random() * 300 + 100,
      fechaInicio: new Date(),
      tiempoTranscurrido: 0,
      duracionEstimada: config.duracion,
      descripcion: parametros.descripcion || config.descripcion,
      error: null,
      parametros: parametros,
      logs: [`${new Date().toISOString()}: Proceso iniciado`]
    };
    
    procesosSimulados.push(nuevoProceso);
    
    // Simular progreso automático del proceso
    simularProgresoBackgroundAPI(nuevoProceso);
    
    return crearRespuesta(nuevoProceso, true, 'Proceso iniciado correctamente');
    
  } catch (error) {
    console.error('Error al iniciar proceso:', error);
    return crearRespuesta(null, false, 'Error al iniciar el proceso');
  }
}

/**
 * Pausa un proceso en ejecución
 */
export async function pausarProceso(procesoId) {
  await delay(200);
  
  try {
    const proceso = procesosSimulados.find(p => p.id === procesoId);
    if (!proceso) {
      return crearRespuesta(null, false, 'Proceso no encontrado');
    }
    
    if (proceso.estado !== ESTADOS_PROCESO.EJECUTANDO) {
      return crearRespuesta(null, false, 'El proceso no se puede pausar en su estado actual');
    }
    
    proceso.estado = ESTADOS_PROCESO.PAUSADO;
    proceso.logs.push(`${new Date().toISOString()}: Proceso pausado`);
    
    return crearRespuesta(proceso, true, 'Proceso pausado correctamente');
    
  } catch (error) {
    console.error('Error al pausar proceso:', error);
    return crearRespuesta(null, false, 'Error al pausar el proceso');
  }
}

/**
 * Reanuda un proceso pausado
 */
export async function reanudarProceso(procesoId) {
  await delay(200);
  
  try {
    const proceso = procesosSimulados.find(p => p.id === procesoId);
    if (!proceso) {
      return crearRespuesta(null, false, 'Proceso no encontrado');
    }
    
    if (proceso.estado !== ESTADOS_PROCESO.PAUSADO) {
      return crearRespuesta(null, false, 'El proceso no se puede reanudar en su estado actual');
    }
    
    proceso.estado = ESTADOS_PROCESO.EJECUTANDO;
    proceso.logs.push(`${new Date().toISOString()}: Proceso reanudado`);
    
    // Continuar simulación
    simularProgresoBackgroundAPI(proceso);
    
    return crearRespuesta(proceso, true, 'Proceso reanudado correctamente');
    
  } catch (error) {
    console.error('Error al reanudar proceso:', error);
    return crearRespuesta(null, false, 'Error al reanudar el proceso');
  }
}

/**
 * Detiene un proceso
 */
export async function detenerProceso(procesoId) {
  await delay(200);
  
  try {
    const proceso = procesosSimulados.find(p => p.id === procesoId);
    if (!proceso) {
      return crearRespuesta(null, false, 'Proceso no encontrado');
    }
    
    if (![ESTADOS_PROCESO.EJECUTANDO, ESTADOS_PROCESO.PAUSADO].includes(proceso.estado)) {
      return crearRespuesta(null, false, 'El proceso no se puede detener en su estado actual');
    }
    
    proceso.estado = ESTADOS_PROCESO.DETENIDO;
    proceso.logs.push(`${new Date().toISOString()}: Proceso detenido por usuario`);
    
    return crearRespuesta(proceso, true, 'Proceso detenido correctamente');
    
  } catch (error) {
    console.error('Error al detener proceso:', error);
    return crearRespuesta(null, false, 'Error al detener el proceso');
  }
}

/**
 * Elimina un proceso terminado
 */
export async function eliminarProceso(procesoId) {
  await delay(200);
  
  try {
    const index = procesosSimulados.findIndex(p => p.id === procesoId);
    if (index === -1) {
      return crearRespuesta(null, false, 'Proceso no encontrado');
    }
    
    const proceso = procesosSimulados[index];
    if (proceso.estado === ESTADOS_PROCESO.EJECUTANDO) {
      return crearRespuesta(null, false, 'No se puede eliminar un proceso en ejecución');
    }
    
    procesosSimulados.splice(index, 1);
    
    return crearRespuesta({ id: procesoId }, true, 'Proceso eliminado correctamente');
    
  } catch (error) {
    console.error('Error al eliminar proceso:', error);
    return crearRespuesta(null, false, 'Error al eliminar el proceso');
  }
}

/**
 * Obtiene los detalles completos de un proceso
 */
export async function getDetalleProceso(procesoId) {
  await delay(100);
  
  try {
    const proceso = procesosSimulados.find(p => p.id === procesoId);
    if (!proceso) {
      return crearRespuesta(null, false, 'Proceso no encontrado');
    }
    
    return crearRespuesta(proceso);
    
  } catch (error) {
    console.error('Error al obtener detalle del proceso:', error);
    return crearRespuesta(null, false, 'Error al obtener los detalles del proceso');
  }
}

/**
 * Obtiene estadísticas generales del sistema
 */
export async function getEstadisticasProcesos() {
  await delay(100);
  
  try {
    const estadisticas = calcularEstadisticas(procesosSimulados);
    
    return crearRespuesta({
      ...estadisticas,
      sistemaOperativo: 'Linux Ubuntu 20.04',
      cpuTotal: 85.5,
      memoriaTotal: 8192,
      memoriaUsada: 4096,
      procesosActivos: procesosSimulados.filter(p => p.estado === ESTADOS_PROCESO.EJECUTANDO).length
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return crearRespuesta(null, false, 'Error al obtener estadísticas del sistema');
  }
}

// Funciones auxiliares

function calcularEstadisticas(procesos) {
  return {
    total: procesos.length,
    ejecutando: procesos.filter(p => p.estado === ESTADOS_PROCESO.EJECUTANDO).length,
    pausados: procesos.filter(p => p.estado === ESTADOS_PROCESO.PAUSADO).length,
    completados: procesos.filter(p => p.estado === ESTADOS_PROCESO.COMPLETADO).length,
    errores: procesos.filter(p => p.estado === ESTADOS_PROCESO.ERROR).length,
    detenidos: procesos.filter(p => p.estado === ESTADOS_PROCESO.DETENIDO).length
  };
}

function simularProgresoBackgroundAPI(proceso) {
  const intervalId = setInterval(() => {
    if (proceso.estado !== ESTADOS_PROCESO.EJECUTANDO) {
      clearInterval(intervalId);
      return;
    }
    
    // Actualizar tiempo transcurrido
    proceso.tiempoTranscurrido++;
    
    // Simular progreso variable
    const incremento = Math.random() * 8 + 2; // 2-10% por segundo
    proceso.progreso = Math.min(100, proceso.progreso + incremento);
    
    // Actualizar recursos con variación realista
    proceso.cpu = Math.max(5, Math.min(95, proceso.cpu + (Math.random() - 0.5) * 15));
    proceso.memoria = Math.max(50, proceso.memoria + (Math.random() - 0.5) * 30);
    
    // Agregar logs ocasionales
    if (Math.random() < 0.1) { // 10% probabilidad
      const mensajes = [
        'Procesando registros...',
        'Validando datos...',
        'Ejecutando cálculos...',
        'Generando resultados...',
        'Actualizando base de datos...'
      ];
      const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];
      proceso.logs.push(`${new Date().toISOString()}: ${mensaje}`);
    }
    
    // Simular posible error (2% probabilidad después del 30% de progreso)
    if (Math.random() < 0.02 && proceso.progreso > 30) {
      proceso.estado = ESTADOS_PROCESO.ERROR;
      proceso.error = 'Error simulado durante la ejecución: Timeout en conexión a base de datos';
      proceso.logs.push(`${new Date().toISOString()}: ERROR - ${proceso.error}`);
      clearInterval(intervalId);
      return;
    }
    
    // Completar proceso
    if (proceso.progreso >= 100) {
      proceso.estado = ESTADOS_PROCESO.COMPLETADO;
      proceso.progreso = 100;
      proceso.cpu = 0;
      proceso.logs.push(`${new Date().toISOString()}: Proceso completado exitosamente`);
      clearInterval(intervalId);
    }
  }, 1000);
}

// Inicializar algunos procesos de ejemplo
function inicializarProcesosEjemplo() {
  // Proceso completado
  const procesoCompletado = {
    id: procesoIdCounter++,
    nombre: 'Importación de Datos #1',
    tipo: 'Importación de Datos',
    tipoProceso: TIPOS_PROCESO.IMPORTACION,
    estado: ESTADOS_PROCESO.COMPLETADO,
    progreso: 100,
    cpu: 0,
    memoria: 120,
    fechaInicio: new Date(Date.now() - 300000), // Hace 5 minutos
    tiempoTranscurrido: 180,
    duracionEstimada: 30000,
    descripcion: 'Importación de archivo de novedades completada exitosamente',
    error: null,
    parametros: { archivo: 'novedades_202410.xlsx' },
    logs: [
      `${new Date(Date.now() - 300000).toISOString()}: Proceso iniciado`,
      `${new Date(Date.now() - 250000).toISOString()}: Validando archivo...`,
      `${new Date(Date.now() - 200000).toISOString()}: Procesando registros...`,
      `${new Date(Date.now() - 120000).toISOString()}: Proceso completado exitosamente`
    ]
  };
  
  procesosSimulados.push(procesoCompletado);
}

// Inicializar datos de ejemplo al cargar el módulo
inicializarProcesosEjemplo();