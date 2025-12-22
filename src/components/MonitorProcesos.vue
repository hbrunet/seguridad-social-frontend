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
            item-value="id"
            item-title="nombre"
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

        <template v-slot:[`item.jobId`]="{ item }">
          <v-chip v-if="item.jobId" size="x-small" color="info" variant="outlined">
            {{ item.jobId.substring(0, 8) }}...
          </v-chip>
          <span v-else class="text-grey">-</span>
        </template>

        <template v-slot:[`item.fechaInicio`]="{ item }">
          {{ formatFecha(item.fechaInicio) }}
        </template>

        <template v-slot:[`item.acciones`]="{ item }">
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
              <v-list-item 
                @click="cancelarProceso(item)" 
                :disabled="item.estado !== ESTADOS_PROCESO.EJECUTANDO"
              >
                <v-list-item-title>
                  <v-icon class="mr-2">mdi-cancel</v-icon>
                  Cancelar
                </v-list-item-title>
              </v-list-item>
              <v-list-item @click="verDetalles(item)">
                <v-list-item-title>
                  <v-icon class="mr-2">mdi-information</v-icon>
                  Detalles
                </v-list-item-title>
              </v-list-item>
              <v-list-item 
                @click="eliminarProceso(item)" 
                :disabled="item.estado === ESTADOS_PROCESO.EJECUTANDO"
                class="text-error"
              >
                <v-list-item-title>
                  <v-icon class="mr-2">mdi-delete</v-icon>
                  Eliminar
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-data-table>

      <!-- Dialogo de Detalles -->
      <v-dialog v-model="dialogDetalles" max-width="600">
        <v-card v-if="procesoSeleccionado">
          <v-card-title>
            <v-icon class="mr-2">mdi-information</v-icon>
            Detalles del Proceso: {{ procesoSeleccionado.nombre }}
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <strong>ID:</strong> {{ procesoSeleccionado.id }}
              </v-col>
              <v-col cols="6">
                <strong>Tipo:</strong> {{ procesoSeleccionado.tipo }}
              </v-col>
              <v-col cols="12" v-if="procesoSeleccionado.jobId">
                <strong>Job ID (Backend):</strong> 
                <v-chip size="small" color="info" class="ml-2">{{ procesoSeleccionado.jobId }}</v-chip>
              </v-col>
              <v-col cols="6">
                <strong>Estado:</strong> {{ procesoSeleccionado.estado }}
              </v-col>
              <v-col cols="6">
                <strong>Progreso:</strong> {{ procesoSeleccionado.progreso }}%
              </v-col>
              <v-col cols="12">
                <strong>Descripción:</strong>
                <p class="mt-2">{{ procesoSeleccionado.descripcion }}</p>
              </v-col>
              <v-col cols="12" v-if="procesoSeleccionado.parametros">
                <strong>Parámetros:</strong>
                <pre class="mt-2 pa-2 bg-grey-lighten-4 rounded">{{ JSON.stringify(procesoSeleccionado.parametros, null, 2) }}</pre>
              </v-col>
              <v-col cols="12" v-if="procesoSeleccionado.logs && procesoSeleccionado.logs.length > 0">
                <strong>Logs:</strong>
                <v-card variant="outlined" class="mt-2" max-height="200" style="overflow-y: auto;">
                  <v-card-text>
                    <div v-for="(log, idx) in procesoSeleccionado.logs" :key="idx" class="text-caption mb-1">
                      {{ log }}
                    </div>
                  </v-card-text>
                </v-card>
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
  configuracionProcesos,
  TIPOS_PROCESO,
  ESTADOS_PROCESO
} from '../api/procesos.js';

// Estados reactivos
const procesos = ref([]);
const loading = ref(false);
const procesando = ref(false);
const autoRefresh = ref(true);
const dialogDetalles = ref(false);
const procesoSeleccionado = ref(null);
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

// Tipos de proceso disponibles (convertir desde la API)
const tiposProceso = ref(
  Object.entries(configuracionProcesos).map(([id, config]) => ({
    id,
    nombre: config.nombre,
    duracion: config.duracion
  }))
);

// Headers de la tabla
const headers = [
  { title: 'ID', value: 'id', sortable: false, width: '60px' },
  { title: 'Nombre', value: 'nombre', sortable: false },
  { title: 'Tipo', value: 'tipo', sortable: false },
  { title: 'Estado', value: 'estado', sortable: false, width: '120px' },
  { title: 'Progreso', value: 'progreso', sortable: false, width: '150px' },
  { title: 'Tiempo', value: 'tiempoTranscurrido', sortable: false, width: '100px' },
  { title: 'Job ID', value: 'jobId', sortable: false, width: '120px' },
  { title: 'Inicio', value: 'fechaInicio', sortable: false, width: '130px' },
  { title: 'Acciones', value: 'acciones', sortable: false, width: '80px' }
];

// Computed properties
const estadisticas = computed(() => {
  return {
    completados: procesos.value.filter(p => p.estado === ESTADOS_PROCESO.COMPLETADO).length,
    ejecutando: procesos.value.filter(p => p.estado === ESTADOS_PROCESO.EJECUTANDO).length,
    errores: procesos.value.filter(p => p.estado === ESTADOS_PROCESO.ERROR).length
  };
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

function formatTiempo(segundos) {
  const mins = Math.floor(segundos / 60);
  const secs = segundos % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFecha(fecha) {
  return new Date(fecha).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
    
    console.log('Iniciando proceso con período:', parametros.periodo);
    
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
    console.error('Error al iniciar proceso:', error);
    mostrarNotificacion('Error al iniciar el proceso', 'error');
  } finally {
    procesando.value = false;
  }
}

async function cancelarProceso(proceso) {
  try {
    const resp = await cancelarProcesoAPI(proceso.id);
    if (resp.ok) {
      await cargarProcesos();
      mostrarNotificacion(`Proceso cancelado: ${proceso.nombre}`, 'warning');
    } else {
      mostrarNotificacion(`Error: ${resp.message}`, 'error');
    }
  } catch (error) {
    console.error('Error al cancelar proceso:', error);
    mostrarNotificacion('Error al cancelar el proceso', 'error');
  }
}

async function eliminarProceso(proceso) {
  if (confirm(`¿Desea eliminar el proceso ${proceso.nombre}?`)) {
    try {
      const resp = await eliminarProcesoAPI(proceso.id);
      if (resp.ok) {
        await cargarProcesos();
        mostrarNotificacion(`Proceso eliminado: ${proceso.nombre}`, 'info');
      } else {
        mostrarNotificacion(`Error: ${resp.message}`, 'error');
      }
    } catch (error) {
      console.error('Error al eliminar proceso:', error);
      mostrarNotificacion('Error al eliminar el proceso', 'error');
    }
  }
}

async function verDetalles(proceso) {
  try {
    const resp = await getDetalleProceso(proceso.id);
    if (resp.ok) {
      procesoSeleccionado.value = resp.data;
      dialogDetalles.value = true;
    } else {
      mostrarNotificacion(`Error: ${resp.message}`, 'error');
    }
  } catch (error) {
    console.error('Error al obtener detalles:', error);
    mostrarNotificacion('Error al obtener detalles del proceso', 'error');
  }
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
    console.error('Error al cargar procesos:', error);
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