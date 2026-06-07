import { createRouter, createWebHashHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import { getAuthData } from '@/api'

const routes = [
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('../pages/DashboardPage.vue') },
      { path: 'plan', component: () => import('../pages/PlanPage.vue') },
      { path: 'order', component: () => import('../pages/OrderPage.vue') },
      { path: 'invite', component: () => import('../pages/InvitePage.vue') },
      { path: 'traffic', component: () => import('../pages/TrafficPage.vue') },
      { path: 'knowledge', component: () => import('../pages/KnowledgePage.vue') },
      { path: 'ticket', component: () => import('../pages/TicketPage.vue') },
      { path: 'profile', component: () => import('../pages/ProfilePage.vue') },
    ],
  },
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const publicPaths = ['/login', '/register']
  const authed = Boolean(getAuthData())
  if (!authed && !publicPaths.includes(to.path)) {
    return { path: '/login' }
  }
  if (authed && publicPaths.includes(to.path)) {
    return { path: '/dashboard' }
  }
  return true
})

export default router
