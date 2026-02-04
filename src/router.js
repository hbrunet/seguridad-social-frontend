import { createRouter, createWebHistory } from 'vue-router';
import { isAuthenticated } from './api/auth';

import Home from './components/Home.vue';
import FileUploader from './components/FileUploader.vue';
import ListadoHojas from './components/ListadoHojas.vue';
import MonitorProcesos from './components/MonitorProcesos.vue';
import Login from './components/Login.vue';
import HistorialEjecuciones from './components/HistorialEjecuciones.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/file-uploader',
    name: 'FileUploader',
    component: FileUploader,
    meta: { requiresAuth: true }
  },
  {
    path: '/listado-hojas',
    name: 'ListadoHojas',
    component: ListadoHojas,
    meta: { requiresAuth: true }
  },
  {
    path: '/monitor-procesos',
    name: 'MonitorProcesos',
    component: MonitorProcesos,
    meta: { requiresAuth: true }
  }
  ,{
    path: '/historial-procesos',
    name: 'HistorialEjecuciones',
    component: HistorialEjecuciones,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard para proteger rutas
router.beforeEach((to, from, next) => {
  const authenticated = isAuthenticated();
  
  console.log('Navegando a:', to.path, 'Desde:', from.path, 'Autenticado:', authenticated);
  
  if (to.meta.requiresAuth && !authenticated) {
    // Ruta requiere autenticación y el usuario no está autenticado
    if (to.path !== '/login') {
      console.log('Redirigiendo a login - usuario no autenticado');
      next({ path: '/login' });
    } else {
      next();
    }
  } else if (to.meta.requiresGuest && authenticated) {
    // Ruta es solo para invitados y el usuario está autenticado
    if (to.path !== '/') {
      console.log('Redirigiendo a home - usuario ya autenticado');
      next({ path: '/' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
