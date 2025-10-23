import { createRouter, createWebHistory } from 'vue-router';

import Home from './components/Home.vue';
import FileUploader from './components/FileUploader.vue';
import ListadoHojas from './components/ListadoHojas.vue';

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
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
