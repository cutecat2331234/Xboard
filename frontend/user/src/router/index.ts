import { createRouter, createWebHashHistory } from 'vue-router'

import LoginPage from '../pages/LoginPage.vue'

import RegisterPage from '../pages/RegisterPage.vue'

import ForgetPasswordPage from '../pages/ForgetPasswordPage.vue'

import { getAuthData } from '@/api'



const routes = [

  { path: '/login', component: LoginPage },

  { path: '/register', component: RegisterPage },

  { path: '/forgetpassword', component: ForgetPasswordPage },

  {

    path: '/',

    component: () => import('../layouts/AppLayout.vue'),

    children: [

      { path: '', redirect: '/dashboard' },

      { path: 'dashboard', component: () => import('../pages/DashboardPage.vue') },

      { path: 'plan', component: () => import('../pages/PlanPage.vue') },

      { path: 'plan/:id', component: () => import('../pages/PlanDetailPage.vue'), meta: { titleKey: 'nav.plan', menuKey: '/plan' } },

      { path: 'order', component: () => import('../pages/OrderPage.vue') },

      { path: 'order/:trade_no', component: () => import('../pages/OrderDetailPage.vue'), meta: { titleKey: 'order.detailTitle', menuKey: '/order' } },

      { path: 'invite', component: () => import('../pages/InvitePage.vue') },

      { path: 'node', component: () => import('../pages/NodePage.vue') },

      { path: 'traffic', component: () => import('../pages/TrafficPage.vue') },

      { path: 'knowledge', component: () => import('../pages/KnowledgePage.vue') },

      { path: 'ticket', component: () => import('../pages/TicketPage.vue') },

      { path: 'ticket/:id', component: () => import('../pages/TicketDetailPage.vue'), meta: { titleKey: 'ticket.view', menuKey: '/ticket' } },

      { path: 'profile', component: () => import('../pages/ProfilePage.vue') },

    ],

  },

]



const router = createRouter({ history: createWebHashHistory(), routes })



router.beforeEach((to) => {

  const publicPaths = ['/login', '/register', '/forgetpassword']

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

