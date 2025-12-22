<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-card-title class="bg-primary text-white">
            <h3 class="text-center w-100">Seguridad Social - Login</h3>
          </v-card-title>
          <v-card-text class="pt-6">
            <v-form ref="form" @submit.prevent="handleLogin">
              <v-text-field
                v-model="userName"
                label="Usuario"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                :rules="[rules.required]"
                :disabled="loading"
                autocomplete="username"
                class="mb-3"
              />
              <v-text-field
                v-model="password"
                label="Contraseña"
                prepend-inner-icon="mdi-lock"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                :rules="[rules.required]"
                :disabled="loading"
                autocomplete="current-password"
                class="mb-3"
              />
              
              <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                closable
                class="mb-3"
                @click:close="errorMessage = ''"
              >
                {{ errorMessage }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="loading"
                :disabled="loading"
              >
                Iniciar Sesión
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { login } from '../api/auth';

const router = useRouter();
const route = useRoute();
const form = ref(null);

const userName = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');

const rules = {
  required: value => !!value || 'Campo requerido'
};

async function handleLogin() {
  // Validar el formulario
  const { valid } = await form.value.validate();
  if (!valid) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    console.log('Intentando login con usuario:', userName.value);
    const result = await login(userName.value, password.value);
    console.log('Resultado del login:', result);
    
    if (result.ok) {
      // Login exitoso, redirigir al home
      console.log('Login exitoso, redirigiendo al home...');
      router.push('/');
    } else {
      // Mostrar mensaje de error
      console.log('Login fallido:', result);
      errorMessage.value = result.message || 'Usuario o contraseña incorrectos';
    }
  } catch (error) {
    console.error('Error en handleLogin:', error);
    errorMessage.value = 'Error al intentar iniciar sesión';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // Mostrar mensaje de sesión expirada si viene de un 401
  try {
    const expiredParam = route.query?.expired;
    const expiredFlag = localStorage.getItem('sessionExpired');
    const storedMessage = localStorage.getItem('sessionExpiredMessage');
    if (expiredParam === '1' || expiredFlag === '1') {
      errorMessage.value = storedMessage || 'Sesión expirada. Por favor, inicie sesión nuevamente.';
      localStorage.removeItem('sessionExpired');
      localStorage.removeItem('sessionExpiredMessage');
    }
  } catch (e) {}
});
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.w-100 {
  width: 100%;
}
</style>
