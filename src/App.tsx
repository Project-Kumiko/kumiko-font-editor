import { Grid, GridItem, useBreakpointValue } from '@chakra-ui/react';
import { useEffect } from 'react';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { loadDraft, saveDraft } from './lib/persistence';
import { useStore } from './store';

function App() {
  const fontData = useStore((state) => state.fontData);
  const hydrateDraft = useStore((state) => state.hydrateDraft);
  const hasHydratedDraft = useStore((state) => state.hasHydratedDraft);
  const markHydratedDraft = useStore((state) => state.markHydratedDraft);
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const draft = await loadDraft();
        if (cancelled) {
          return;
        }

        if (draft) {
          hydrateDraft(draft);
          return;
        }

        markHydratedDraft();
      } catch (error) {
        console.warn('Unable to load IndexedDB draft.', error);
        if (!cancelled) {
          markHydratedDraft();
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [hydrateDraft, markHydratedDraft]);

  useEffect(() => {
    if (!hasHydratedDraft || !fontData) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveDraft(fontData).catch((error) => {
        console.warn('Unable to save IndexedDB draft.', error);
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fontData, hasHydratedDraft]);

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
