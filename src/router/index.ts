import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Settings',
    component: () => import('@/views/Settings/Index.vue'),
  },
  {
    path: '/dock',
    name: 'Dock',
    component: () => import('@/views/Dock.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

