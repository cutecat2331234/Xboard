import { createRouter, createWebHashHistory } from 'vue-router'

import AuthPage from '../pages/AuthPage.vue'

import { getAuthData } from '@/api'
import { fetchUserCommConfig } from '@/api/comm'
import { featureEnabled } from '@/lib/feature-flags'
import { useAuthStore } from '@/stores/auth'
import { getSessionCache, invalidateSessionCache, setSessionCache } from '@/lib/session-cache'

export { invalidateSessionCache }

const publicPaths = ['/login', '/register', '/forgetpassword']

async function ensureValidSession(): Promise<boolean> {
  if (!getAuthData()) {
    invalidateSessionCache()
    return false
  }

  const { lastSessionCheckAt, lastSessionValid, SESSION_CHECK_TTL_MS } = getSessionCache()
  const now = Date.now()
  if (now - lastSessionCheckAt < SESSION_CHECK_TTL_MS) {
    return lastSessionValid
  }

  const valid = await useAuthStore().checkSession()
  setSessionCache(valid, now)
  return valid
}

const routes = [

  { path: '/login', component: AuthPage },

  {
    path: '/register',
    redirect: (to) => ({ path: '/login', query: { ...to.query, tab: 'register' } }),
  },

  {
    path: '/forgetpassword',
    redirect: (to) => ({ path: '/login', query: { ...to.query, tab: 'forget' } }),
  },

  {

    path: '/',

    component: () => import('../layouts/AppLayout.vue'),

    children: [

      { path: '', redirect: '/dashboard' },

      { path: 'dashboard', component: () => import('../pages/DashboardPage.vue') },

      { path: 'plan', component: () => import('../pages/PlanPage.vue') },

      { path: 'plan/:id', component: () => import('../pages/PlanDetailPage.vue'), meta: { titleKey: 'plan.viewDetail', menuKey: '/plan' } },

      { path: 'order', component: () => import('../pages/OrderPage.vue') },

      { path: 'order/:trade_no', component: () => import('../pages/OrderDetailPage.vue'), meta: { titleKey: 'order.detailTitle', menuKey: '/order' } },

      { path: 'invite', component: () => import('../pages/InvitePage.vue') },

      { path: 'gift-card', component: () => import('../pages/GiftCardPage.vue') },

      { path: 'node', component: () => import('../pages/NodePage.vue') },

      { path: 'traffic', component: () => import('../pages/TrafficPage.vue') },

      { path: 'knowledge', component: () => import('../pages/KnowledgePage.vue') },

      { path: 'ticket', component: () => import('../pages/TicketPage.vue') },

      { path: 'ticket/:id', component: () => import('../pages/TicketDetailPage.vue'), meta: { titleKey: 'ticket.view', menuKey: '/ticket' } },

      { path: 'profile', component: () => import('../pages/ProfilePage.vue') },

      { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue') },

    ],

  },

]



const router = createRouter({ history: createWebHashHistory(), routes })



router.beforeEach(async (to) => {

  const hasTokenLogin = to.path === '/login' && typeof to.query.verify === 'string' && to.query.verify.length > 0

  if (getAuthData()) {
    const valid = await ensureValidSession()
    if (!valid && !publicPaths.includes(to.path)) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
    if (valid && publicPaths.includes(to.path) && !hasTokenLogin) {
      return { path: '/dashboard' }
    }
    if (valid && (to.path === '/gift-card' || to.path === '/invite' || to.path === '/ticket' || to.path.startsWith('/ticket/'))) {
      try {
        const comm = await fetchUserCommConfig()
        if (to.path === '/gift-card' && !featureEnabled(comm.gift_card_enable, true)) {
          return { path: '/dashboard' }
        }
        if (to.path === '/invite' && !featureEnabled(comm.invite_enable, true)) {
          return { path: '/dashboard' }
        }
        if ((to.path === '/ticket' || to.path.startsWith('/ticket/')) && !featureEnabled(comm.ticket_enable, true)) {
          return { path: '/dashboard' }
        }
      } catch {
        return { path: '/dashboard' }
      }
    }
    return true
  }

  if (!publicPaths.includes(to.path)) {

    return { path: '/login', query: { redirect: to.fullPath } }

  }

  return true

})



export default router
