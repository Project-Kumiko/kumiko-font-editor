import { FontOverviewScreen } from './components/FontOverviewScreen'
import { Home } from './components/Home'
import { EditorLayout } from './components/app/EditorLayout'
import { useAutoDraftSave } from './hooks/useAutoDraftSave'
import { useStore } from './store'

function App() {
  const fontData = useStore((state) => state.fontData)
  const workspaceView = useStore((state) => state.workspaceView)

  useAutoDraftSave()

  if (!fontData) {
    return <Home />
  }

  if (workspaceView === 'overview') {
    return <FontOverviewScreen />
  }

  return <EditorLayout />
}

export default App
