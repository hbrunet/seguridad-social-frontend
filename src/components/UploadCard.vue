<template>
    <v-card class="mx-auto my-12" max-width="800">
        <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-upload</v-icon>
            Subir archivo de novedades
        </v-card-title>
        <v-card-text>
            <v-file-input :model-value="localFile" label="Seleccionar archivo" show-size :disabled="uploading"
                @update:modelValue="$emit('file-change', $event)" prepend-icon="mdi-paperclip"></v-file-input>

            <v-alert v-if="uploadError" type="error" class="mt-2">{{ uploadError }}</v-alert>
        </v-card-text>
        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn :disabled="!localFile || uploading || uploaded || creating" color="primary" class="mt-4"
                @click="$emit('upload')">
                {{ uploading ? 'Subiendo...' : 'Subir' }}
                <v-icon icon="mdi-chevron-right" end></v-icon>
            </v-btn>
        </v-card-actions>
        <div v-if="uploading" class="mt-4">
            <v-progress-linear indeterminate color="primary" height="8"></v-progress-linear>
        </div>
    </v-card>
</template>

<script setup>
import { ref, watch } from 'vue';
const props = defineProps({ 
  file: Object, 
  uploading: Boolean, 
  uploadError: String, 
  uploaded: Boolean, 
  creating: Boolean 
});
const localFile = ref(props.file);
watch(() => props.file, (v) => (localFile.value = v));
</script>
