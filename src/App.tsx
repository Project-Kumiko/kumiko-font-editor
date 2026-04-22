import { useEffect, useRef } from 'react';
import { Grid, GridItem, useBreakpointValue } from '@chakra-ui/react';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { FontOverviewScreen } from './components/FontOverviewScreen';
import { Home } from './components/Home';
import { useStore } from './store';
import { saveDraftSnapshot } from './lib/draftSave';

function App() {
  const fontData = useStore((state) => state.fontData);
  const projectId = useStore((state) => state.projectId);
  const projectTitle = useStore((state) => state.projectTitle);
  const dirtyGlyphIds = useStore((state) => state.dirtyGlyphIds);
  const deletedGlyphIds = useStore((state) => state.deletedGlyphIds);
  const selectedLayerId = useStore((state) => state.selectedLayerId);
  const isDirty = useStore((state) => state.isDirty);
  const markDraftSaved = useStore((state) => state.markDraftSaved);
  const workspaceView = useStore((state) => state.workspaceView);
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const autosaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!fontData || !projectId || !projectTitle || !isDirty) {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void saveDraftSnapshot({
        projectId,
        projectTitle,
        fontData,
        dirtyGlyphIds,
        deletedGlyphIds,
        selectedLayerId,
      }).then(() => {
        markDraftSaved();
      }).catch((error) => {
        console.warn('Auto draft save failed.', error);
      });
    }, 3000);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    dirtyGlyphIds,
    deletedGlyphIds,
    fontData,
    isDirty,
    markDraftSaved,
    projectId,
    projectTitle,
    selectedLayerId,
  ]);

  if (!fontData) {
    return <Home />;
  }

  if (workspaceView === 'overview') {
    return <FontOverviewScreen />;
  }

  return (
    <Grid
      templateColumns={isDesktop ? '300px minmax(0, 1fr) 320px' : '1fr'}
      templateRows={isDesktop ? '1fr' : 'minmax(280px, 36vh) minmax(420px, 1fr) auto'}
      templateAreas={
        isDesktop
          ? `"left canvas right"`
          : `"left"
             "canvas"
             "right"`
      }
      h="100vh"
      w="100vw"
      overflow="hidden"
      bg="gray.950"
    >
      <GridItem area="left" minW={0} minH={0}>
        <LeftPanel />
      </GridItem>
      <GridItem area="canvas" minW={0} minH={0}>
        <CanvasWorkspace />
      </GridItem>
      <GridItem area="right" minW={0} minH={0}>
        <RightPanel />
      </GridItem>
    </Grid>
  );
}

export default App;
