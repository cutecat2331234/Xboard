import { Outlet } from 'react-router-dom'
import { PageToolbar } from './PageToolbar'
import { Sidebar } from './Sidebar'

export function AdminShell() {
  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-background">
      <Sidebar />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden pt-16 md:ml-64 md:pt-0">
        <PageToolbar />
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 [scrollbar-gutter:stable] md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
