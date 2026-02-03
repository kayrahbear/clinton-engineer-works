import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route
          path="/sims"
          element={
            <Placeholder
              title="Sims hub"
              description="View, search, and manage your Sims once the API layer is wired up."
            />
          }
        />
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
