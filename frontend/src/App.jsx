import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'
import Sims from './pages/Sims'
import SimDetail from './pages/SimDetail'
import SimForm from './pages/SimForm'
import FamilyTree from './pages/FamilyTree'
import LegacyWizard from './pages/LegacyWizard'
import LegacyDashboard from './pages/LegacyDashboard'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/sims" element={<Sims />} />
        <Route path="/sims/:id" element={<SimDetail />} />
        <Route path="/sims/:id/family-tree" element={<FamilyTree />} />
        <Route path="/sims/new" element={<SimForm />} />
        <Route path="/legacy/new" element={<LegacyWizard />} />
        <Route path="/legacy/:legacyId" element={<LegacyDashboard />} />
        <Route
          path="/legacy"
          element={
            <Placeholder
              title="Legacy overview"
              description="Track generation progress, laws, and milestones from this view."
            />
          }
        />
      </Route>
    </Routes>
  )
}

export default App
