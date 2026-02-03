import { Outlet } from 'react-router-dom'
import Header from './Header'
import Main from './Main'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen ff-app-bg text-ff-text">
      <Header />

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 md:grid-cols-[220px_1fr]">
        <Sidebar />
        <Main>
          <Outlet />
        </Main>
      </main>
    </div>
  )
}