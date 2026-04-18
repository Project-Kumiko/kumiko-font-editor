import { Grid, GridItem, useBreakpointValue } from '@chakra-ui/react';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { Home } from './components/Home';
import { useStore } from './store';

function App() {
  const fontData = useStore((state) => state.fontData);
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  if (!fontData) {
    return <Home />;
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
