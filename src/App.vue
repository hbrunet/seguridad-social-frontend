

<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Seguridad Social</v-toolbar-title>  
      <v-spacer />
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn variant="text" v-bind="props">
            Novedades
            <v-icon end>mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item to="/file-uploader" exact>
            <v-list-item-title>
              <v-icon class="mr-2">mdi-upload</v-icon>
              Subir Archivo
            </v-list-item-title>
          </v-list-item>
          <v-list-item to="/listado-hojas">
            <v-list-item-title>
              <v-icon class="mr-2">mdi-file-multiple</v-icon>
              Administrar de Hojas
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>


<script setup>
// El menú y layout principal se definen aquí
</script>
