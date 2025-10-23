<template>
  <UploadCard :file="file" :uploading="uploading" :uploadError="uploadError" :uploadInfo="uploadInfo"
    :uploadDetails="uploadDetails" :uploaded="uploaded" :creating="creating" @file-change="onFileChange" @upload="uploadFile" />

  <CreateCard v-if="uploaded" :periodo="periodo" :periodoInvalid="periodoInvalid" :selectedRep="selectedRep"
    :reparticiones="reparticiones" :repInvalid="repInvalid" :tiposLiquidacion="tiposLiquidacion"
    :selectedTipoLiquidacion="selectedTipoLiquidacion" :tipoInvalid="tipoInvalid" :createError="createError"
    :createInfo="createInfo" :creating="creating" :canCreate="canCreate" :created="created" @back="goBack"
    @create="crearHojaNovedades" @finalize="finalizar" @update:periodo="setPeriodo" @update:selectedRep="setSelectedRep"
    @update:selectedTipoLiquidacion="setSelectedTipoLiquidacion" />

</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import UploadCard from './UploadCard.vue';
import CreateCard from './CreateCard.vue';

const MAX_SIZE_MB = 70;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
import { uploadFileWithProgress, crearHoja } from '../api/novedades.js';
import { getReparticiones, getTiposLiquidacion } from '../api/configuracion.js';
import { formatAmount } from '../utils/formatNumber.js';

const file = ref(null);
const fileInputRef = ref(null);
const uploadError = ref('');
const createError = ref('');
const uploading = ref(false);
const uploadInfo = ref('');
const uploadDetails = ref(null);
const createInfo = ref('');
const uploaded = ref(false);
const uploadedFile = {
  id_archivo: 0,
  cantidad_registros: 0
};
const reparticiones = ref([]);
const periodo = ref('');
const selectedRep = ref(null);
const tiposLiquidacion = ref([]);
const selectedTipoLiquidacion = ref(null);
const creating = ref(false);
const created = ref(false);
const nroHojaCreada = ref(null);

const router = useRouter();

// Validación para habilitar el botón Crear
const canCreate = computed(() => {
  const periodoOk = !!periodo.value && /^\d{4}-\d{2}$/.test(periodo.value);
  const repOk = !!selectedRep.value;
  const tipoOk = !!selectedTipoLiquidacion.value;
  return periodoOk && repOk && tipoOk;
});

const periodoInvalid = computed(() => !!periodo.value && !/^\d{4}-\d{2}$/.test(periodo.value));
const repInvalid = computed(() => selectedRep.value === null);
const tipoInvalid = computed(() => selectedTipoLiquidacion.value === null);

onMounted(() => {
  loadOptions();
});

function goBack() {
  // volver a la tarjeta de subida
  uploaded.value = false;
  createError.value = '';
  createInfo.value = '';
  // reset file input component if available
  if (fileInputRef.value && typeof fileInputRef.value.reset === 'function') {
    fileInputRef.value.reset();
  }
}

function finalizar() {
  // Guardar el número de hoja antes de limpiar
  const nroHoja = nroHojaCreada.value;
  
  // limpiar todo y volver al estado inicial
  file.value = null;
  uploadError.value = '';
  uploadInfo.value = '';
  uploadDetails.value = null;
  uploaded.value = false;
  uploadedFile.id_archivo = 0;
  uploadedFile.cantidad_registros = 0;
  periodo.value = '';
  selectedRep.value = null;
  selectedTipoLiquidacion.value = null;
  createError.value = '';
  createInfo.value = '';
  created.value = false;
  nroHojaCreada.value = null;
  
  // Navegar al listado de hojas con filtro de número de hoja
  if (nroHoja) {
    router.push({ path: '/listado-hojas', query: { nroHoja } });
  } else {
    router.push('/listado-hojas');
  }
}

function loadOptions() {
  // Use configuracion API helpers which return normalized responses
  getReparticiones()
    .then(r => {
      if (r.ok) {
        const raw = r.data || [];
        // Normalize items so v-select always receives objects with id_rep and descripcion
        reparticiones.value = raw.map(item => {
          const id = item.id_rep ?? item.id ?? item.Id ?? item.ID ?? item.codigo ?? item.value ?? null;
          const desc = item.descripcion ?? item.descripcion_rep ?? item.name ?? item.nombre ?? item.text ?? (item.label || JSON.stringify(item));
          return { id_rep: id != null ? String(id) : null, descripcion: desc };
        }).filter(x => x.id_rep !== null);
      } else console.error('Error al cargar reparticiones:', r.message);
    })
    .catch(err => console.error('Error al cargar reparticiones:', err));

  getTiposLiquidacion()
    .then(r => {
      if (r.ok) {
        const raw = r.data || [];
        tiposLiquidacion.value = raw.map(item => {
          const id = item.id_tipo_liquidacion ?? item.id ?? item.Id ?? item.ID ?? item.codigo ?? item.value ?? null;
          const desc = item.descripcion ?? item.name ?? item.nombre ?? item.text ?? (item.label || JSON.stringify(item));
          return { id_tipo_liquidacion: id != null ? String(id) : null, descripcion: desc };
        }).filter(x => x.id_tipo_liquidacion !== null);
      } else console.error('Error al cargar tipos liquidacion:', r.message);
    })
    .catch(err => console.error('Error al cargar tipos liquidacion:', err));
}

function onFileChange(payload) {
  // payload may be a File object (from v-file-input) or an event
  let selected = null;
  if (!payload) selected = null;
  else if (payload.target && payload.target.files) selected = payload.target.files[0];
  else selected = payload;

  // If payload is an array or FileList, take first file
  if (Array.isArray(selected)) selected = selected[0];
  if (selected && selected.length && selected[0] && selected[0].size) selected = selected[0];

  if (selected && selected.size > MAX_SIZE_BYTES) {
    uploadError.value = `El archivo supera el límite de ${MAX_SIZE_MB} MB.`;
    file.value = null;
  } else {
    uploadError.value = '';
    file.value = selected;
    uploadInfo.value = '';
    uploaded.value = false;
  }
}

function setPeriodo(v) {
  periodo.value = v;
}

function setSelectedRep(v) {
  selectedRep.value = v != null ? String(v) : null;
}

function setSelectedTipoLiquidacion(v) {
  selectedTipoLiquidacion.value = v != null ? String(v) : null;
}

async function uploadFile() {
  if (!file.value) return;
  uploading.value = true;
  const formData = new FormData();
  formData.append('file', file.value);
  formData.append('tipoNovedad', '156');


  // start upload
  try {
    const resp = await uploadFileWithProgress(formData);
    uploading.value = false;
    if (resp.ok && resp.data) {
      // upload response handled
      if (resp.data.error_ora === 0) {
        uploadInfo.value = 'El archivo fue cargado correctamente';
        uploadDetails.value = {
          empleados: resp.data.cantidad_registros,
          rem1: formatAmount(resp.data.sum_rem1),
          rem2: formatAmount(resp.data.sum_rem2),
          rem3: formatAmount(resp.data.sum_rem3)
        };
        uploaded.value = true;
        uploadedFile.id_archivo = resp.data.id_archivo;
        uploadedFile.cantidad_registros = resp.data.cantidad_registros;
        uploadedFile.flow_id = resp.data.flow_id;
      } else {
        uploadError.value = `Error al subir archivo: ${resp.message || JSON.stringify(resp.data) || 'unknown'}`;
        uploaded.value = false;
      }
    } else {
      uploadError.value = `Error al subir archivo: status=${resp.status} message=${resp.message || JSON.stringify(resp.data)}`;
      uploaded.value = false;
    }
  } catch (e) {
    uploading.value = false;
    // Show detailed error
    uploadError.value = `Error de red al subir archivo: ${e?.message || e}`;
    uploaded.value = false;
  }
}

async function crearHojaNovedades() {
  createInfo.value = '';
  createError.value = '';

  const body = {
    id_archivo: uploadedFile.id_archivo,
    tipo_novedad: 156,
    grupo_adicional: 0,
    tipo_liquidacion: selectedTipoLiquidacion.value,
    cantidad_registros: uploadedFile.cantidad_registros,
    // Convertir periodo (YYYY-MM) a fecha con día 01 (YYYY-MM-01)
    periodo: (periodo.value && /^\d{4}-\d{2}$/.test(periodo.value)) ? `${periodo.value}-01` : null,
    id_rep: selectedRep.value,
    flow_id: uploadedFile.flow_id
  };
  // validations
  if (!uploadedFile.id_archivo) {
    createError.value = 'No hay archivo válido cargado. Revise la carga.';
    return;
  }
  try {
    creating.value = true;
    const resp = await crearHoja(body);
    if (resp.ok) {
      nroHojaCreada.value = resp.data?.nro_hoja || null;
      createInfo.value = `La hoja de novedades número "${resp.data?.nro_hoja || ''}", fue creada correctamente.`;
      created.value = true;
    } else {
      createError.value = resp.message || 'Error al crear la hoja de novedades.';
      created.value = false;
    }
  } catch (e) {
    createError.value = 'Error de red al crear la hoja de novedades.';
    created.value = false;
  } finally {
    creating.value = false;
  }
}
</script>
