

<template>
  <v-app>
    <v-app-bar app color="primary" dark v-if="isAuthenticated">
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
          <v-list-item to="/monitor-procesos">
            <v-list-item-title>
              <v-icon class="mr-2">mdi-monitor</v-icon>
              Monitor de Procesos
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      
      <v-chip class="mx-3" prepend-icon="mdi-account">
        {{ userName }}
      </v-chip>
      
      <v-btn variant="text" @click="handleLogout">
        <v-icon>mdi-logout</v-icon>
        Salir
      </v-btn>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>


<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { logout, isAuthenticated as checkAuth, getUserName } from './api/auth';

const router = useRouter();
const route = useRoute();

const userName = ref('');
const isAuthenticated = ref(checkAuth());

onMounted(() => {
  userName.value = getUserName() || '';
  isAuthenticated.value = checkAuth();
});

// Actualizar userName e isAuthenticated cuando cambie la ruta (después del login)
router.afterEach(() => {
  userName.value = getUserName() || '';
  isAuthenticated.value = checkAuth();
});

// También observar cambios en la ruta
watch(() => route.path, () => {
  isAuthenticated.value = checkAuth();
  userName.value = getUserName() || '';
});

async function handleLogout() {
  await logout();
  isAuthenticated.value = false;
  userName.value = '';
  router.push('/login');
}
</script>
