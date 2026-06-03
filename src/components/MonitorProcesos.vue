<template>
  <v-card class="mx-auto my-12" max-width="1200">
    <v-card-title>
      <v-icon class="mr-2">mdi-monitor</v-icon>
      Monitor de Procesos 
    </v-card-title>
    
    <v-card-text>
      <!-- Panel de Control -->
      <v-row class="mb-4">
        <v-col cols="12" md="3">
          <v-select
            v-model="tipoProceso"
            :items="tiposProceso"
            return-object
            item-value="id"
            item-title="name"
            label="Tipo de Proceso"
            clearable
          ></v-select>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="periodo"
            label="Período"
            type="month"
            clearable
            density="compact"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="2">
          <v-btn 
            color="primary" 
            @click="iniciarProceso"
            :disabled="!tipoProceso || !periodo || procesando"
            prepend-icon="mdi-play"
            block
          >
            Iniciar Proceso
          </v-btn>
        </v-col>
        <v-col cols="12" md="3">
          <v-switch
            v-model="autoRefresh"
            label="Auto Refresh (cada 3s)"
            color="success"
            @change="toggleAutoRefresh"
          ></v-switch>
        </v-col>
      </v-row>

      <!-- Estadísticas Rápidas -->
      <v-row class="mb-4">
        <v-col cols="12" md="3">
          <v-card color="success" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="24" class="mb-2">mdi-check-circle</v-icon>
              <div class="text-h6">{{ estadisticas.completados }}</div>
              <div class="text-caption">Completados</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="primary" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="24" class="mb-2">mdi-cog</v-icon>
              <div class="text-h6">{{ estadisticas.ejecutando }}</div>
              <div class="text-caption">Ejecutando</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="error" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="24" class="mb-2">mdi-alert-circle</v-icon>
              <div class="text-h6">{{ estadisticas.errores }}</div>
              <div class="text-caption">Con Error</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tabla de Procesos -->
      <v-data-table 
        :headers="headers"
        :items="procesos"
        :loading="loading"
        class="elevation-1"
        item-key="id"
      >
        <template v-slot:[`item.estado`]="{ item }">
          <v-chip 
            :color="getEstadoColor(item.estado)" 
            size="small"
            :prepend-icon="getEstadoIcon(item.estado)"
          >
            {{ item.estado }}
          </v-chip>
        </template>

        <template v-slot:[`item.progreso`]="{ item }">
          <div class="d-flex align-center">
            <v-progress-linear
              :model-value="item.progreso"
              :color="getProgresoColor(item.progreso)"
              height="8"
              class="mr-2"
              style="min-width: 100px"
            ></v-progress-linear>
            <span class="text-caption">{{ item.progreso }}%</span>
          </div>
        </template>

        <template v-slot:[`item.tiempoTranscurrido`]="{ item }">
          {{ formatTiempo(item.tiempoTranscurrido) }}
        </template>

        <template v-slot:[`item.fechaInicio`]="{ item }">
          {{ formatFechaHora(item.fechaInicio) }}
        </template>

        <template v-slot:[`item.acciones`]="{ item }">
          <div class="d-flex align-center">
            <v-btn
              v-if="puedeDescargar(item)"
              icon="mdi-download"
              size="small"
              variant="text"
              color="success"
              title="Descargar resultado"
              @click="descargarArchivo(item)"
            ></v-btn>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn 
                  icon="mdi-dots-vertical" 
                  size="small" 
                  variant="text" 
                  v-bind="props"
                ></v-btn>
              </template>
              <v-list>
                <v-list-item @click="verDetalles(item)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-information</v-icon>
                    Detalles
                  </v-list-item-title>
                </v-list-item>
                <v-list-item v-if="puedeDescargar(item)" @click="descargarArchivo(item)">
                  <v-list-item-title>
                    <v-icon class="mr-2" color="success">mdi-download</v-icon>
                    Descargar resultado
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </template>
      </v-data-table>

      <!-- Dialogo de Detalles -->
      <v-dialog v-model="dialogDetalles" max-width="900">
        <v-card v-if="procesoSeleccionado">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-information</v-icon>
            Detalles del Proceso
                <v-spacer />
            <v-btn icon variant="text" @click="dialogDetalles = false" aria-label="Cerrar">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <strong>Tipo:</strong> {{ procesoSeleccionado.tipo }}
              </v-col>
              <v-col cols="12" v-if="procesoSeleccionado.jobId">
                <strong>ID:</strong> 
                <v-chip size="small" color="info" class="ml-2">{{ procesoSeleccionado.jobId }}</v-chip>
              </v-col>
              <v-col cols="6">
                <strong>Estado:</strong> {{ procesoSeleccionado.estado }}
              </v-col>
              <v-col cols="6">
                <strong>Progreso:</strong> {{ procesoSeleccionado.progreso }}%
              </v-col>
              <v-col cols="12" v-if="procesoSeleccionado.parametros">
                <strong>Parámetros:</strong>
                <pre class="mt-2 pa-2 bg-grey-lighten-4 rounded">{{ JSON.stringify(procesoSeleccionado.parametros, null, 2) }}</pre>
              </v-col>
              <v-col cols="12" v-if="procesoSeleccionado.jobId">
                <strong>Logs del servidor:</strong>
                <v-alert v-if="logsError" type="error" density="compact" class="mt-2 mb-0">{{ logsError }}</v-alert>
                <v-skeleton-loader v-else-if="logsLoading" type="table" class="mt-2" />
                <v-data-table
                  v-else
                  :headers="logsHeaders"
                  :items="logsTableItems"
                  class="elevation-0 mt-2"
                  density="compact"
                  :items-per-page="10"
                >
                  <template v-slot:[`item.timestamp`]="{ value }">
                    {{ formatFechaHora(value) }}
                  </template>
                  <template #no-data>
                    <div class="text-caption">Sin logs para mostrar.</div>
                  </template>
                </v-data-table>
              </v-col>
              <v-col cols="12" v-if="procesoSeleccionado.error">
                <strong>Error:</strong>
                <v-alert type="error" class="mt-2">{{ procesoSeleccionado.error }}</v-alert>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="dialogDetalles = false">Cerrar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Notificaciones -->
      <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        :timeout="3000"
        location="top right"
      >
        {{ snackbar.mensaje }}
        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
        </template>
      </v-snackbar>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { 
  getProcesos, 
  iniciarProceso as iniciarProcesoAPI, 
  cancelarProceso as cancelarProcesoAPI,
  eliminarProceso as eliminarProcesoAPI,
  getDetalleProceso,
  getJobLogs,
  descargarResultado,
  TIPOS_PROCESO,
  ESTADOS_PROCESO,
  TIPOS_CON_DESCARGA
} from '../api/procesos.js';
import { getJobTypes } from '../api/configuracion.js';
import { formatFechaHora, formatTiempo } from '../utils/formatDate.js';

// Estados reactivos
const procesos = ref([]);
const loading = ref(false);
const procesando = ref(false);
const autoRefresh = ref(true);
const dialogDetalles = ref(false);
const procesoSeleccionado = ref(null);
const logsBackend = ref([]);
const logsLoading = ref(false);
const logsError = ref('');
const tipoProceso = ref(null);
const periodo = ref(new Date().toISOString().substring(0, 7)); // Formato YYYY-MM por defecto

// Configuración
const refreshInterval = ref(null);
const procesoIdCounter = ref(1);

// Notificaciones
const snackbar = ref({
  show: false,
  mensaje: '',
  color: 'info'
});

// Tipos de proceso disponibles (se cargarán desde la API)
const tiposProceso = ref([]);

// Headers de la tabla de procesos
const headers = [
  { title: 'ID', value: 'jobId', sortable: false },
  { title: 'Tipo', value: 'tipo', sortable: false },
  { title: 'Periodo', value: 'periodo', sortable: false },
  { title: 'Estado', value: 'estado', sortable: false },
  { title: 'Progreso', value: 'progreso', sortable: false },
  { title: 'Tiempo', value: 'tiempoTranscurrido', sortable: false },
  { title: 'Inicio', value: 'fechaInicio', sortable: false },
  { title: 'Acciones', value: 'acciones', sortable: false }
];

const logsHeaders = [
  { title: 'Fecha', value: 'timestamp' },
  { title: 'Tipo', value: 'level' },
  { title: 'Mensaje', value: 'message' }
];

// Computed properties
const estadisticas = computed(() => {
  return {
    completados: procesos.value.filter(p => p.estado === ESTADOS_PROCESO.COMPLETADO).length,
    ejecutando: procesos.value.filter(p => p.estado === ESTADOS_PROCESO.EJECUTANDO).length,
    errores: procesos.value.filter(p => p.estado === ESTADOS_PROCESO.ERROR).length
  };
});

const logsTableItems = computed(() => {
  return (logsBackend.value || []).map(normalizeLogItem);
});

// Funciones de utilidad
function getEstadoColor(estado) {
  const colores = {
    [ESTADOS_PROCESO.PENDIENTE]: 'info',
    [ESTADOS_PROCESO.EJECUTANDO]: 'primary',
    [ESTADOS_PROCESO.COMPLETADO]: 'success',
    [ESTADOS_PROCESO.ERROR]: 'error',
    [ESTADOS_PROCESO.CANCELADO]: 'grey'
  };
  return colores[estado] || 'grey';
}

function getEstadoIcon(estado) {
  const iconos = {
    [ESTADOS_PROCESO.PENDIENTE]: 'mdi-clock-outline',
    [ESTADOS_PROCESO.EJECUTANDO]: 'mdi-cog',
    [ESTADOS_PROCESO.COMPLETADO]: 'mdi-check-circle',
    [ESTADOS_PROCESO.ERROR]: 'mdi-alert-circle',
    [ESTADOS_PROCESO.CANCELADO]: 'mdi-cancel'
  };
  return iconos[estado] || 'mdi-help-circle';
}

function getProgresoColor(progreso) {
  if (progreso < 30) return 'error';
  if (progreso < 70) return 'warning';
  return 'success';
}

function puedeDescargar(item) {
  return item.estado === ESTADOS_PROCESO.COMPLETADO &&
    TIPOS_CON_DESCARGA.includes(item.tipo);
}

async function descargarArchivo(item) {
  if (!item.jobId) {
    mostrarNotificacion('No hay ID de job para descargar', 'warning');
    return;
  }
  mostrarNotificacion('Preparando descarga...', 'info');
  const resp = await descargarResultado(item.jobId);
  if (!resp.ok) {
    mostrarNotificacion(resp.error, 'error');
    return;
  }
  if (resp.type === 'url') {
    const a = document.createElement('a');
    a.href = resp.url;
    if (resp.filename) a.download = resp.filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    const objectUrl = URL.createObjectURL(resp.blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = resp.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }
  mostrarNotificacion('Descarga iniciada', 'success');
}

function mostrarNotificacion(mensaje, color = 'info') {
  snackbar.value = {
    show: true,
    mensaje,
    color
  };
}

// Funciones de proceso
async function iniciarProceso() {
  if (!tipoProceso.value) return;

  procesando.value = true;

  try {
    // Preparar parámetros incluyendo el período
    const parametros = {
      periodo: periodo.value || new Date().toISOString().substring(0, 7)
    };
    
    const resp = await iniciarProcesoAPI(tipoProceso.value, parametros);
    
    if (resp.ok) {
      await cargarProcesos(); // Recargar la lista
      mostrarNotificacion(`Proceso iniciado: ${resp.data.nombre}`, 'success');
      // No limpiar el tipo de proceso para facilitar pruebas repetidas
      // tipoProceso.value = null;
    } else {
      mostrarNotificacion(`Error: ${resp.message}`, 'error');
    }
  } catch (error) {
    mostrarNotificacion('Error al iniciar el proceso', 'error');
  } finally {
    procesando.value = false;
  }
}

async function verDetalles(proceso) {
  logsBackend.value = [];
  logsError.value = '';
  try {
    const resp = await getDetalleProceso(proceso.id);
    if (resp.ok) {
      procesoSeleccionado.value = resp.data;
      dialogDetalles.value = true;
      if (resp.data.jobId) {
        logsLoading.value = true;
        try {
          const logsResp = await getJobLogs(resp.data.jobId);
          if (logsResp.ok) {
            logsBackend.value = logsResp.data.items;
          } else {
            logsError.value = logsResp.error || 'No fue posible obtener los logs.';
          }
        } catch (e) {
          logsError.value = 'Error al obtener los logs.';
        } finally {
          logsLoading.value = false;
        }
      }
    } else {
      mostrarNotificacion(`Error: ${resp.message}`, 'error');
    }
  } catch (error) {
    mostrarNotificacion('Error al obtener detalles del proceso', 'error');
  }
}

function normalizeLogItem(log) {
  if (log == null) return { timestamp: '—', level: '—', message: '—' };
  if (typeof log === 'string') return { timestamp: '—', level: '—', message: log };
  return {
    timestamp: log.timestamp ?? log.log_timestamp ?? log.time ?? log.created_at ?? log.createdAt ?? '—',
    level:     log.level ?? log.log_level ?? log.severity ?? log.nivel ?? '—',
    message:   log.message ?? log.log_message ?? log.mensaje ?? log.msg ?? '—'
  };
}

// Función para cargar procesos desde la API
async function cargarProcesos() {
  loading.value = true;
  try {
    const resp = await getProcesos();
    if (resp.ok) {
      procesos.value = resp.data.procesos;
    } else {
      mostrarNotificacion(`Error: ${resp.message}`, 'error');
    }
  } catch (error) {
    mostrarNotificacion('Error al cargar los procesos', 'error');
  } finally {
    loading.value = false;
  }
}

function toggleAutoRefresh() {
  if (autoRefresh.value) {
    iniciarAutoRefresh();
  } else {
    detenerAutoRefresh();
  }
}

function iniciarAutoRefresh() {
  refreshInterval.value = setInterval(async () => {
    // Recargar procesos automáticamente
    await cargarProcesos();
  }, 3000); // Cada 3 segundos
}

function detenerAutoRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
}

// Lifecycle hooks
onMounted(async () => {
  // Cargar procesos existentes
  await cargarProcesos();
  // Cargar job types desde la API de configuración
  try {
    const res = await getJobTypes();
    if (res.ok) {
      const data = res.data ?? res.data?.items ?? [];
      const list = Array.isArray(data) ? data : [];
      tiposProceso.value = list;
    }
  } catch (e) {
    // silencioso: los tipos quedan vacíos, el select mostrará lista vacía
  }
  
  // Iniciar auto-refresh si está habilitado
  if (autoRefresh.value) {
    iniciarAutoRefresh();
  }
});

onUnmounted(() => {
  detenerAutoRefresh();
});
</script>

<style scoped>
.v-data-table {
  background-color: transparent;
}

.v-chip {
  font-weight: 500;
}

.text-caption {
  font-size: 0.75rem !important;
}
</style>