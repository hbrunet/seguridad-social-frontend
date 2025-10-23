<template>
  <v-container class="fill-height d-flex flex-column justify-center align-center">
    <v-row>
      <v-col cols="12" class="text-center">
        <v-icon size="80" color="primary">mdi-home</v-icon>
        <h1 class="mb-4">Bienvenido a la Gestión de Hojas</h1>
        <p class="mb-6">Utilice el menú superior para subir una hoja de novedades o consultar el listado de hojas creadas.</p>
        <v-btn to="/file-uploader" color="primary" class="mr-2">Subir Hoja</v-btn>
        <v-btn to="/listado-hojas" color="secondary">Listado de Hojas</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// Componente Home de bienvenida
</script>
