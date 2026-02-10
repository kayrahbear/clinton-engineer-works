import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Header from './Header'
import Main from './Main'
import Sidebar from './Sidebar'
import AgentSidebar from './AgentSidebar'

export default function Layout() {
  const [agentOpen, setAgentOpen] = useState(false)

  return (
    <div className="min-h-screen ff-app-bg text-ff-text">
      <Header
        agentOpen={agentOpen}
        onToggleAgent={() => setAgentOpen((prev) => !prev)}
      />
      <AgentSidebar isOpen={agentOpen} onClose={() => setAgentOpen(false)} />

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 md:grid-cols-[220px_1fr]">
        <Sidebar />
        <Main>
          <Outlet />
        </Main>
      </main>
    </div>
  )
}
