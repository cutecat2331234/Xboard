import { Navigate, Route, Routes } from 'react-router-dom'
import { getAuthData } from '@/lib/api'
import { AdminShell } from '@/components/layout/AdminShell'
import { ModulePage } from '@/components/ModulePage'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import { ADMIN_NAV } from '@/lib/nav'

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
        path="/"
        element={
          <RequireAuth>
            <AdminShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        {ADMIN_NAV.filter((n) => n.path !== '/').map((item) => (
          <Route
            key={item.path}
            path={item.path.replace(/^\//, '')}
            element={
              <ModulePage
                titleKey={item.labelKey}
                apiPath={item.apiPath ?? '/'}
                useEditor={item.path === '/config'}
              />
            }
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
