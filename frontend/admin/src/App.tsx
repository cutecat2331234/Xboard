import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { getAuthData } from '@/lib/api'
import { AdminShell } from '@/components/layout/AdminShell'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ConfigPage from '@/pages/ConfigPage'
import PluginPage from '@/pages/modules/PluginPage'
import ThemePage from '@/pages/modules/ThemePage'
import NoticePage from '@/pages/modules/NoticePage'
import PaymentPage from '@/pages/modules/PaymentPage'
import KnowledgePage from '@/pages/modules/KnowledgePage'
import ServerManagePage from '@/pages/modules/ServerManagePage'
import ServerMachinePage from '@/pages/modules/ServerMachinePage'
import ServerGroupPage from '@/pages/modules/ServerGroupPage'
import ServerRoutePage from '@/pages/modules/ServerRoutePage'
import PlanPage from '@/pages/modules/PlanPage'
import OrderPage from '@/pages/modules/OrderPage'
import CouponPage from '@/pages/modules/CouponPage'
import GiftCardPage from '@/pages/modules/GiftCardPage'
import UserPage from '@/pages/modules/UserPage'
import TicketPage from '@/pages/modules/TicketPage'
import TrafficResetPage from '@/pages/modules/TrafficResetPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PluginAdminRoute from '@/pages/PluginAdminRoute'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getAuthData()) {
    return <Navigate to="/sign-in" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        }
      >
        <Route element={<AdminShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="config/system/*" element={<ConfigPage />} />
          <Route path="config/plugin" element={<PluginPage />} />
          <Route path="plugins/:code/*" element={<PluginAdminRoute />} />
          <Route path="config/theme" element={<ThemePage />} />
          <Route path="config/notice" element={<NoticePage />} />
          <Route path="config/payment" element={<PaymentPage />} />
          <Route path="config/knowledge" element={<KnowledgePage />} />
          <Route path="server/manage" element={<ServerManagePage />} />
          <Route path="server/machine" element={<ServerMachinePage />} />
          <Route path="server/group" element={<ServerGroupPage />} />
          <Route path="server/route" element={<ServerRoutePage />} />
          <Route path="finance/plan" element={<PlanPage />} />
          <Route path="finance/order" element={<OrderPage />} />
          <Route path="finance/coupon" element={<CouponPage />} />
          <Route path="finance/gift-card" element={<GiftCardPage />} />
          <Route path="user/manage" element={<UserPage />} />
          <Route path="user/ticket" element={<TicketPage />} />
          <Route path="traffic-reset" element={<TrafficResetPage />} />
          {/* legacy redirects */}
          <Route path="config" element={<Navigate to="/config/system" replace />} />
          <Route path="plugin" element={<Navigate to="/config/plugin" replace />} />
          <Route path="theme" element={<Navigate to="/config/theme" replace />} />
          <Route path="notice" element={<Navigate to="/config/notice" replace />} />
          <Route path="payment" element={<Navigate to="/config/payment" replace />} />
          <Route path="knowledge" element={<Navigate to="/config/knowledge" replace />} />
          <Route path="plan" element={<Navigate to="/finance/plan" replace />} />
          <Route path="order" element={<Navigate to="/finance/order" replace />} />
          <Route path="coupon" element={<Navigate to="/finance/coupon" replace />} />
          <Route path="gift-card" element={<Navigate to="/finance/gift-card" replace />} />
          <Route path="user" element={<Navigate to="/user/manage" replace />} />
          <Route path="ticket" element={<Navigate to="/user/ticket" replace />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
