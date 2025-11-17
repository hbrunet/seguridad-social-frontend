<template>
  <v-card class="mx-auto my-4" max-width="800">
    <v-card-title>
      <v-icon class="mr-2">mdi-shield-check</v-icon>
      Validación de Datos
    </v-card-title>
    
    <v-card-text>
      <!-- Información del archivo cargado -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 bg-info">
          <v-icon class="mr-2">mdi-file-chart</v-icon>
          Resumen del Archivo Cargado
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-list density="compact" class="bg-transparent">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-account-group</v-icon>
                  </template>
                  <v-list-item-title>Cantidad de agentes</v-list-item-title>
                  <v-list-item-subtitle class="text-h6 text-primary">
                    {{ formatAmount(uploadDetails?.empleados || uploadDetails?.cantidad_registros || 0) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col cols="12" md="6">
              <v-list density="compact" class="bg-transparent">
                <v-list-item density="compact">
                  <template v-slot:prepend>
                    <v-icon size="small" color="success">mdi-cash</v-icon>
                  </template>
                  <v-list-item-title class="text-caption">Remuneración 1</v-list-item-title>
                  <template v-slot:append>
                    <span class="text-body-2 font-weight-medium">{{ uploadDetails?.rem1 || '0' }}</span>
                  </template>
                </v-list-item>
                <v-list-item density="compact">
                  <template v-slot:prepend>
                    <v-icon size="small" color="success">mdi-cash</v-icon>
                  </template>
                  <v-list-item-title class="text-caption">Remuneración 2</v-list-item-title>
                  <template v-slot:append>
                    <span class="text-body-2 font-weight-medium">{{ uploadDetails?.rem2 || '0' }}</span>
                  </template>
                </v-list-item>
                <v-list-item density="compact">
                  <template v-slot:prepend>
                    <v-icon size="small" color="success">mdi-cash</v-icon>
                  </template>
                  <v-list-item-title class="text-caption">Remuneración 3</v-list-item-title>
                  <template v-slot:append>
                    <span class="text-body-2 font-weight-medium">{{ uploadDetails?.rem3 || '0' }}</span>
                  </template>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Estado de validación -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-h6">
          Estado de Validación
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-progress-linear
                v-if="validating"
                indeterminate
                color="primary"
                height="6"
              ></v-progress-linear>
              
              <div v-if="!validating && !validationCompleted" class="text-center py-4">
                <v-icon size="48" color="grey">mdi-clipboard-check-outline</v-icon>
                <p class="mt-2 text-body-1">Presione "Validar" para iniciar el proceso de validación</p>
              </div>
              
              <div v-if="validationCompleted && !hasErrors" class="text-center py-4">
                <v-icon size="64" color="success">mdi-check-circle</v-icon>
                <p class="mt-2 text-h6 text-success">Validación exitosa</p>
                <p class="text-body-2">Todos los datos son correctos. Puede continuar con la creación de la hoja.</p>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Resultados de validación -->
      <v-expand-transition>
        <div v-if="validationResults">
          <!-- Resumen de validación -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-h6">
              <v-icon class="mr-2">mdi-chart-bar</v-icon>
              Resumen de Validación
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <v-card color="success" variant="tonal">
                    <v-card-text class="text-center">
                      <v-icon size="32" class="mb-2">mdi-check-circle</v-icon>
                      <div class="text-h5">{{ validationResults.registros_validos || 0 }}</div>
                      <div class="text-caption">Registros Válidos</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="4">
                  <v-card color="warning" variant="tonal">
                    <v-card-text class="text-center">
                      <v-icon size="32" class="mb-2">mdi-alert</v-icon>
                      <div class="text-h5">{{ validationResults.registros_advertencias || 0 }}</div>
                      <div class="text-caption">Con Advertencias</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="4">
                  <v-card color="error" variant="tonal">
                    <v-card-text class="text-center">
                      <v-icon size="32" class="mb-2">mdi-close-circle</v-icon>
                      <div class="text-h5">{{ validationResults.registros_errores || 0 }}</div>
                      <div class="text-caption">Con Errores</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Lista de errores -->
          <v-card v-if="hasErrors" variant="outlined" class="mb-4">
            <v-card-title class="text-h6 bg-error">
              <v-icon class="mr-2">mdi-alert-circle</v-icon>
              Errores Encontrados ({{ validationResults.errores?.length || 0 }})
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item
                  v-for="(error, index) in validationResults.errores"
                  :key="index"
                  class="mb-2"
                >
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-close-circle</v-icon>
                  </template>
                  <v-list-item-title>{{ error.mensaje || error.message }}</v-list-item-title>
                  <v-list-item-subtitle v-if="error.linea">
                    Línea: {{ error.linea }} 
                    <span v-if="error.columna">| Columna: {{ error.columna }}</span>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- Lista de advertencias -->
          <v-card v-if="hasWarnings" variant="outlined" class="mb-4">
            <v-card-title class="text-h6 bg-warning">
              <v-icon class="mr-2">mdi-alert</v-icon>
              Advertencias ({{ validationResults.advertencias?.length || 0 }})
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item
                  v-for="(warning, index) in validationResults.advertencias"
                  :key="index"
                  class="mb-2"
                >
                  <template v-slot:prepend>
                    <v-icon color="warning">mdi-alert</v-icon>
                  </template>
                  <v-list-item-title>{{ warning.mensaje || warning.message }}</v-list-item-title>
                  <v-list-item-subtitle v-if="warning.linea">
                    Línea: {{ warning.linea }}
                    <span v-if="warning.columna">| Columna: {{ warning.columna }}</span>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </div>
      </v-expand-transition>

      <!-- Mensaje de error general -->
      <v-alert v-if="validationError" type="error" class="mt-4">
        {{ validationError }}
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-btn @click="goBack" :disabled="validating">
        <v-icon class="mr-2">mdi-arrow-left</v-icon>
        Volver
      </v-btn>
      <v-spacer></v-spacer>
      
      <v-btn
        v-if="!validationCompleted"
        color="primary"
        @click="validateData"
        :loading="validating"
        :disabled="validating"
      >
        <v-icon class="mr-2">mdi-shield-check</v-icon>
        Validar
      </v-btn>

      <v-btn
        v-if="validationCompleted && !hasErrors"
        color="success"
        @click="continueToCreate"
        :disabled="validating"
      >
        Continuar
        <v-icon class="ml-2">mdi-arrow-right</v-icon>
      </v-btn>

      <v-btn
        v-if="validationCompleted && hasErrors"
        color="warning"
        @click="validateData"
        :disabled="validating"
      >
        <v-icon class="mr-2">mdi-refresh</v-icon>
        Re-validar
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { formatAmount } from '../utils/formatNumber.js';
import { validarArchivo } from '../api/novedades.js';

// Props
const props = defineProps({
  uploadDetails: {
    type: Object,
    required: true
  },
  idArchivo: {
    type: Number,
    required: true
  },
  flowId: {
    type: String,
    required: false
  }
});

// Emits
const emit = defineEmits(['back', 'continue']);

// Estados reactivos
const validating = ref(false);
const validationCompleted = ref(false);
const validationError = ref('');
const validationResults = ref(null);

// Computed properties
const hasErrors = computed(() => {
  return validationResults.value?.registros_errores > 0 || 
         (validationResults.value?.errores && validationResults.value.errores.length > 0);
});

const hasWarnings = computed(() => {
  return validationResults.value?.registros_advertencias > 0 || 
         (validationResults.value?.advertencias && validationResults.value.advertencias.length > 0);
});

// Limpiar estado cuando cambia el archivo (nuevo upload)
watch(() => props.idArchivo, () => {
  validating.value = false;
  validationCompleted.value = false;
  validationError.value = '';
  validationResults.value = null;
});

// Funciones
function goBack() {
  emit('back');
}

function continueToCreate() {
  emit('continue', validationResults.value);
}

async function validateData() {
  validating.value = true;
  validationError.value = '';
  validationCompleted.value = false;
  
  try {
    const response = await validarArchivo(props.idArchivo, props.flowId);
    
    if (response.ok) {
      validationResults.value = response.data;
      validationCompleted.value = true;
      
      // Si hay errores críticos, mostrar mensaje
      if (hasErrors.value) {
        validationError.value = 'Se encontraron errores en el archivo. Por favor, revise y corrija antes de continuar.';
      }
    } else {
      validationError.value = response.message || 'Error al validar el archivo';
    }
  } catch (error) {
    console.error('Error en validación:', error);
    validationError.value = 'Error al ejecutar la validación del archivo';
  } finally {
    validating.value = false;
  }
}
</script>

<style scoped>
.v-card-title.bg-error {
  background-color: rgba(var(--v-theme-error), 0.1);
}

.v-card-title.bg-warning {
  background-color: rgba(var(--v-theme-warning), 0.1);
}

.v-card-title.bg-info {
  background-color: rgba(var(--v-theme-info), 0.1);
}
</style>
