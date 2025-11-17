<template>
  <v-container>
    <v-card class="mx-auto my-4" max-width="1200">
      <v-card-title>
        <v-icon class="mr-2">mdi-file-upload</v-icon>
        Carga de Archivo de Novedades
      </v-card-title>
      
      <v-card-text>
        <!-- Mostrar nombre del archivo si está seleccionado -->
        <v-card 
          v-if="file" 
          variant="outlined" 
          class="mb-4 bg-blue-lighten-5"
        >
          <v-card-text class="py-3">
            <v-row align="center" no-gutters>
              <v-col cols="auto">
                <v-avatar color="primary" size="40">
                  <v-icon color="white">mdi-file-document</v-icon>
                </v-avatar>
              </v-col>
              <v-col class="ml-3">
                <div class="text-subtitle-1 font-weight-medium">{{ file.name }}</div>
                <div class="text-caption text-grey">
                  <v-icon size="small" class="mr-1">mdi-file-outline</v-icon>
                  {{ formatFileSize(file.size) }}
                  <span class="mx-2">•</span>
                  <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                  {{ new Date().toLocaleDateString() }}
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Stepper para mostrar los 3 pasos -->
        <v-stepper v-model="currentStep" alt-labels>
          <v-stepper-header>
            <v-stepper-item
              :complete="currentStep > 1"
              :value="1"
              title="Subir Archivo"
              :color="currentStep >= 1 ? 'primary' : ''"
            >
              <template v-slot:icon>
                <v-icon>mdi-upload</v-icon>
              </template>
            </v-stepper-item>

            <v-divider></v-divider>

            <v-stepper-item
              :complete="currentStep > 2"
              :value="2"
              title="Validar Datos"
              :color="currentStep >= 2 ? 'primary' : ''"
              :disabled="!uploaded"
            >
              <template v-slot:icon>
                <v-icon>mdi-shield-check</v-icon>
              </template>
            </v-stepper-item>

            <v-divider></v-divider>

            <v-stepper-item
              :value="3"
              title="Crear Hoja"
              :color="currentStep >= 3 ? 'primary' : ''"
              :disabled="!validated"
            >
              <template v-slot:icon>
                <v-icon>mdi-file-document-plus</v-icon>
              </template>
            </v-stepper-item>
          </v-stepper-header>

          <v-stepper-window>
            <!-- Paso 1: Subir Archivo -->
            <v-stepper-window-item :value="1">
              <UploadCard 
                :file="file" 
                :uploading="uploading" 
                :uploadError="uploadError" 
                :uploaded="uploaded" 
                :creating="creating" 
                @file-change="onFileChange" 
                @upload="uploadFile" 
              />
            </v-stepper-window-item>

            <!-- Paso 2: Validar -->
            <v-stepper-window-item :value="2">
              <ValidateCard 
                :uploadDetails="uploadDetails"
                :idArchivo="uploadedFile.id_archivo"
                :flowId="uploadedFile.flow_id"
                @back="goToStep(1)"
                @continue="onValidationComplete"
              />
            </v-stepper-window-item>

            <!-- Paso 3: Crear Hoja -->
            <v-stepper-window-item :value="3">
              <CreateCard 
                :periodo="periodo" 
                :periodoInvalid="periodoInvalid" 
                :selectedRep="selectedRep"
                :reparticiones="reparticiones" 
                :repInvalid="repInvalid" 
                :tiposLiquidacion="tiposLiquidacion"
                :selectedTipoLiquidacion="selectedTipoLiquidacion" 
                :tipoInvalid="tipoInvalid" 
                :createError="createError"
                :createInfo="createInfo" 
                :creating="creating" 
                :canCreate="canCreate" 
                :created="created" 
                @back="goToStep(2)"
                @create="crearHojaNovedades" 
                @finalize="finalizar" 
                @update:periodo="setPeriodo" 
                @update:selectedRep="setSelectedRep"
                @update:selectedTipoLiquidacion="setSelectedTipoLiquidacion" 
              />
            </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import UploadCard from './UploadCard.vue';
import ValidateCard from './ValidateCard.vue';
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
const validated = ref(false);
const validationResults = ref(null);
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

// Control del stepper
const currentStep = ref(1);

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

function goToStep(step) {
  currentStep.value = step;
  
  // Limpiar todo al volver al paso 1 (permitir subir nuevo archivo)
  if (step === 1) {
    file.value = null;
    uploadError.value = '';
    uploadInfo.value = '';
    uploadDetails.value = null;
    uploaded.value = false;
    validated.value = false;
    validationResults.value = null;
    uploadedFile.id_archivo = 0;
    uploadedFile.cantidad_registros = 0;
    uploadedFile.flow_id = null;
  }
  
  // Limpiar errores de creación al volver al paso 2
  if (step === 2) {
    createError.value = '';
    createInfo.value = '';
  }
}

function onValidationComplete(results) {
  // Guardar resultados de validación y avanzar al paso 3
  validationResults.value = results;
  validated.value = true;
  currentStep.value = 3;
}

function finalizar() {
  // Guardar el número de hoja antes de limpiar
  const nroHoja = nroHojaCreada.value;
  
  // limpiar todo y volver al estado inicial
  currentStep.value = 1;
  file.value = null;
  uploadError.value = '';
  uploadInfo.value = '';
  uploadDetails.value = null;
  uploaded.value = false;
  validated.value = false;
  validationResults.value = null;
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

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  return mb.toFixed(1) + ' MB';
}

async function uploadFile() {
  if (!file.value) return;
  uploading.value = true;
  
  // Limpiar resultados de validación anteriores
  validated.value = false;
  validationResults.value = null;
  
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
          rem3: formatAmount(resp.data.sum_rem3),
          nombre_archivo: file.value.name,
          cantidad_registros: resp.data.cantidad_registros
        };
        uploaded.value = true;
        uploadedFile.id_archivo = resp.data.id_archivo;
        uploadedFile.cantidad_registros = resp.data.cantidad_registros;
        uploadedFile.flow_id = resp.data.flow_id;
        
        // Avanzar automáticamente al paso 2 (Validación)
        currentStep.value = 2;
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
