import { lazy, Suspense } from 'react'
import { useAutoDraftSave } from './hooks/useAutoDraftSave'
import { useStore } from './store'

const Home = lazy(() =>
  import('./features/home/Home').then((module) => ({ default: module.Home }))
)
const FontOverviewScreen = lazy(() =>
  import('./features/fontOverview/FontOverviewScreen').then((module) => ({
    default: module.FontOverviewScreen,
  }))
)
const EditorLayout = lazy(() =>
  import('./features/editor/EditorLayout').then((module) => ({
    default: module.EditorLayout,
  }))
)

function App() {
  const fontData = useStore((state) => state.fontData)
  const workspaceView = useStore((state) => state.workspaceView)

  useAutoDraftSave()

  if (!fontData) {
    return (
      <Suspense fallback={null}>
        <Home />
      </Suspense>
    )
  }

  if (workspaceView === 'overview') {
    return (
      <Suspense fallback={null}>
        <FontOverviewScreen />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={null}>
      <EditorLayout />
    </Suspense>
  )
}

export default App
