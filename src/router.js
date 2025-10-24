import { createRouter, createWebHistory } from 'vue-router';

import Home from './components/Home.vue';
import FileUploader from './components/FileUploader.vue';
import ListadoHojas from './components/ListadoHojas.vue';
import MonitorProcesos from './components/MonitorProcesos.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/file-uploader',
    name: 'FileUploader',
    component: FileUploader
  },
  {
    path: '/listado-hojas',
    name: 'ListadoHojas',
    component: ListadoHojas
  },
  {
    path: '/monitor-procesos',
    name: 'MonitorProcesos',
    component: MonitorProcesos
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
