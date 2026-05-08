import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <div className="flex-1 flex flex-col relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto app-main">
          <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 lg:px-12 pt-8 pb-16">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
