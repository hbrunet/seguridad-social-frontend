<template>
  <v-card class="mx-auto my-12" max-width="1000">
    <v-card-title>
      <v-icon class="mr-2">mdi-file-multiple</v-icon>
      Hojas
    </v-card-title>
    <v-card-text>
      <v-row class="md-4">
        <v-col cols="12" md="2">
          <v-text-field v-model="filtroNroHoja" label="Nro. Hoja" type="number" clearable></v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field v-model="filtroPeriodo" label="Periodo" type="month" clearable></v-text-field>
        </v-col>
        <v-col cols="12" md="4">
          <v-select v-model="filtroEstado" :items="estados" item-value="id_estado" item-title="descripcion"
            label="Estado" clearable :return-object="false"></v-select>
        </v-col>
      </v-row>
      <v-row class="md-4">
        <v-col cols="12" md="5">
          <v-select v-model="filtroReparticion" :items="reparticiones" item-value="id_rep" item-title="descripcion"
            label="Repartición" clearable :return-object="false"></v-select>
        </v-col>
        <v-col cols="12" md="2">
          <v-btn color="primary" @click="buscarHojas" block>Buscar</v-btn>
        </v-col>
      </v-row>
      <v-data-table 
        :headers="headers"
        :items="hojas"
        :loading="loading"
        class="elevation-1">
        <template v-slot:[`item.periodo`]="{ value }">
          {{ formatPeriodo(value) }}
        </template>
        <template v-slot:[`item.fecha_alta`]="{ value }">
          {{ formatFecha(value) }}
        </template>
        <template v-slot:[`item.acciones`]="{ item }">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn icon="mdi-dots-vertical" size="small" variant="text" v-bind="props"></v-btn>
            </template>
            <v-list>
              <v-list-item @click="procesarHoja(item)" :disabled="!puedeProcesar(item)">
                <v-list-item-title>
                  <v-icon class="mr-2">mdi-cog</v-icon>
                  Procesar
                </v-list-item-title>
              </v-list-item>
              <v-list-item @click="anularHoja(item)" :disabled="!puedeAnular(item)">
                <v-list-item-title>
                  <v-icon class="mr-2">mdi-close-circle</v-icon>
                  Anular
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
        <template v-slot:bottom>
          <div class="text-center pa-4">
            <v-pagination
              v-model="page"
              :length="Math.ceil(totalItems / itemsPerPage)"
              :total-visible="7"
              @update:model-value="changePage"
            ></v-pagination>
          </div>
        </template>
      </v-data-table>
      
      <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
    </v-card-text>
  </v-card>
  
  <!-- Notificaciones -->
  <v-snackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    :timeout="4000"
    location="top right"
  >
    {{ snackbar.message }}
    <template v-slot:actions>
      <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getHojas, procesarHoja as procesarHojaAPI, anularHoja as anularHojaAPI } from '../api/novedades.js';
import { getEstadosHoja } from '../api/configuracion.js';
import { getReparticiones } from '../api/configuracion.js';

const route = useRoute();

const filtroNroHoja = ref('');
const filtroPeriodo = ref('');
const filtroEstado = ref(null);
const filtroReparticion = ref(null);
const hojas = ref([]);
const loading = ref(false);
const error = ref('');
const estados = ref([]);
const reparticiones = ref([]);
const headers = [
  { title: 'Número', value: 'nro_hoja', sortable: false, align: 'end' },
  { title: 'Periodo', value: 'periodo', sortable: false },
  { title: 'Rep.', value: 'id_rep', sortable: false, align: 'end' },
  { title: 'Tipo', value: 'tipo_liquidacion', sortable: false },
  { title: 'Rectificativa', value: 'id_grupo_adicional', sortable: false, align: 'end' },
  { title: 'Estado', value: 'estado', sortable: false },
  { title: 'Cant. Reg.', value: 'cantidad_reg', sortable: false, align: 'end' },
  { title: 'Creada', value: 'fecha_alta', sortable: false },
  { title: 'Acciones', value: 'acciones', sortable: false, align: 'center' }
];
const page = ref(1);
const itemsPerPage = ref(10);
const totalItems = ref(0);
const snackbar = ref({
  show: false,
  message: '',
  color: 'info'
});

function formatPeriodo(value) {
  if (!value) return '';
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
}

function formatFecha(value) {
  if (!value) return '';
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function changePage(newPage) {
  page.value = newPage;
  buscarHojas();
}

onMounted(() => {
  // Leer el parámetro nroHoja de la query string
  if (route.query.nroHoja) {
    filtroNroHoja.value = route.query.nroHoja;
  }

  fetchEstados();
  fetchReparticiones();

  // Si hay un filtro de nroHoja, buscar automáticamente
  if (filtroNroHoja.value) {
    buscarHojas();
  }
});

async function fetchEstados() {
  loading.value = true;
  error.value = '';
  try {
    const resp = await getEstadosHoja();
    estados.value = resp.data || [];
    if (!resp.ok) error.value = resp.message || 'Error al obtener estados.';
  } catch (e) {
    error.value = 'Error al obtener estados.';
  } finally {
    loading.value = false;
  }
}

async function fetchReparticiones() {
  loading.value = true;
  error.value = '';
  try {
    const resp = await getReparticiones();
    reparticiones.value = resp.data || [];
    if (!resp.ok) error.value = resp.message || 'Error al obtener reparticiones.';
  } catch (e) {
    error.value = 'Error al obtener reparticiones.';
  } finally {
    loading.value = false;
  }
}

async function buscarHojas() {
  loading.value = true;
  error.value = '';
  try {
    const params = {
      nroHoja: filtroNroHoja.value,
      periodo: filtroPeriodo.value,
      estado: filtroEstado.value,
      reparticion: filtroReparticion.value,
      page: page.value,
      pageSize: itemsPerPage.value
    };
    const resp = await getHojas(params);
    hojas.value = resp.data?.hojas || [];
    totalItems.value = resp.data?.total_registros || resp.data?.totalRegistros || resp.data?.total || hojas.value.length;
    if (!resp.ok) error.value = resp.message || 'Error al obtener hojas.';
  } catch (e) {
    error.value = 'Error al obtener hojas.';
  } finally {
    loading.value = false;
  }
}

function puedeProcesar(item) {
  // Lógica: se puede procesar si está supervizada
  return item.id_estado === 6
}

function puedeAnular(item) {
  // Lógica: se puede anular si no está procesada o anulada
  return item.id_estado !== 9 && item.id_estado !== 7;
}

function mostrarNotificacion(message, color = 'info') {
  snackbar.value = {
    show: true,
    message,
    color
  };
}

async function procesarHoja(item) {
  if (!confirm(`¿Desea procesar la hoja ${item.nro_hoja}?`)) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    // Llamar al API para procesar la hoja
    const resp = await procesarHojaAPI(item.id);
    
    if (resp.ok) {
      // Mostrar mensaje de éxito
      mostrarNotificacion(`Hoja ${item.nro_hoja} enviada a procesar correctamente`, 'success');
      // Recargar la lista para ver el cambio de estado
      await buscarHojas();
    } else {
      error.value = resp.message || 'Error al procesar la hoja.';
      mostrarNotificacion(resp.message || 'Error al procesar la hoja.', 'error');
    }
  } catch (e) {
    console.error('Error al procesar hoja:', e);
    error.value = 'Error al procesar la hoja.';
    mostrarNotificacion('Error al procesar la hoja.', 'error');
  } finally {
    loading.value = false;
  }
}

async function anularHoja(item) {
  if (!confirm(`¿Desea anular la hoja ${item.nro_hoja}?`)) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    // Llamar al API para anular la hoja
    const resp = await anularHojaAPI(item.id);

    if (resp.ok) {
      // Mostrar mensaje de éxito
      mostrarNotificacion(`Hoja ${item.nro_hoja} anulada correctamente`, 'success');
      // Recargar la lista para ver el cambio de estado
      await buscarHojas();
    } else {
      error.value = resp.message || 'Error al anular la hoja.';
      mostrarNotificacion(resp.message || 'Error al anular la hoja.', 'error');
    }
  } catch (e) {
    console.error('Error al anular hoja:', e);
    error.value = 'Error al anular la hoja.';
    mostrarNotificacion('Error al anular la hoja.', 'error');
  } finally {
    loading.value = false;
  }
}
</script>
