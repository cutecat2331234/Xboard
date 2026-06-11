import { Outlet } from 'react-router-dom'
import { PageToolbar } from './PageToolbar'
import { Sidebar } from './Sidebar'

export function AdminShell() {
  return (
    <div className="relative h-full overflow-hidden bg-background">
      <Sidebar />
      <main className="h-full overflow-x-hidden pt-16 transition-[margin] md:ml-64 md:overflow-y-hidden md:pt-0">
        <div className="relative flex h-full w-full flex-col">
          <PageToolbar />
          <div className="flex-1 overflow-hidden px-4 py-6 md:px-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
