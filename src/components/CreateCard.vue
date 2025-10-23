<template>
  <v-card class="mx-auto my-12" max-width="800">
    <v-card-title>
      <v-icon class="mr-2">mdi-file-document-outline</v-icon>
      Crear Hoja Novedades
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field :model-value="periodo" label="Periodo" type="month" :error="periodoInvalid" :error-messages="periodoInvalid ? ['Formato inválido (YYYY-MM)'] : []" required @update:modelValue="$emit('update:periodo', $event)"></v-text-field>
        </v-col>
        <v-col cols="12" md="4">
          <v-select :model-value="selectedRep" :items="reparticiones" item-value="id_rep" item-title="descripcion" label="Repartición" :error="repInvalid" :error-messages="repInvalid ? ['Seleccione una repartición'] : []" required @update:modelValue="$emit('update:selectedRep', $event)"></v-select>
        </v-col>
        <v-col cols="12" md="4">
          <v-select :model-value="selectedTipoLiquidacion" :items="tiposLiquidacion" item-value="id_tipo_liquidacion" item-title="descripcion" label="Tipo" :error="tipoInvalid" :error-messages="tipoInvalid ? ['Seleccione un tipo'] : []" required @update:modelValue="$emit('update:selectedTipoLiquidacion', $event)"></v-select>
        </v-col>
      </v-row>
      <v-alert v-if="createError" type="error" class="mt-2">{{ createError }}</v-alert>
      <v-alert v-if="createInfo" type="success" class="mt-2">{{ createInfo }}</v-alert>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
  <v-btn v-if="!createInfo || createError" text :disabled="creating" @click="$emit('back')">Volver</v-btn>
      <v-btn color="primary" :disabled="!canCreate || creating || created" @click="$emit('create')">{{ creating ? 'Creando...' : 'Crear' }} <v-icon icon="mdi-chevron-right" end></v-icon></v-btn>
      <v-btn v-if="createInfo && !createError" color="secondary" class="ml-2" @click="$emit('finalize')">Finalizar <v-icon icon="mdi-check" end></v-icon></v-btn>
    </v-card-actions>
    <v-progress-linear v-if="creating" indeterminate color="secondary" height="6"></v-progress-linear>
  </v-card>
</template>

<script setup>
const props = defineProps({ periodo: String, periodoInvalid: Boolean, selectedRep: [String, Number], reparticiones: Array, repInvalid: Boolean, tiposLiquidacion: Array, selectedTipoLiquidacion: [String, Number], tipoInvalid: Boolean, createError: String, createInfo: String, creating: Boolean, canCreate: Boolean, created: Boolean });
</script>
