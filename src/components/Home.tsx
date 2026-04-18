import { useState, useEffect } from 'react';
import { Box, Button, Heading, Text, VStack, Input, HStack, Divider } from '@chakra-ui/react';
import { parseOpenStep } from '../lib/openstepParser';
import { useStore } from '../store';
import type { FontData, GlyphAnchor, GlyphComponentRef, GlyphGuideline, GlyphLayerData, GlyphMetrics, PathData, PathNode } from '../store';
import { getAllProjects, saveProject, deleteProject } from '../lib/persistence';
import type { ProjectDraft } from '../lib/persistence';

export function Home() {
  const loadProjectState = useStore(state => state.loadProjectState);
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getAllProjects().then(setProjects).catch(console.error);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    // 使用 setTimeout 讓 React 有時間先渲染畫面上的 isLoading 狀態
    setTimeout(async () => {
      try {
        const rawText = await file.text();
        
        // 我們的客製化 parser 具備 O(N) 一次掃描能力
        // 不再發生 JSON.parse 與字串過大的卡頓，也不需要過濾字元了
        const parsed = parseOpenStep(rawText) as any;
        const { fontData, projectMetadata, projectSourceFormat } = mapGlyphsToProjectData(parsed);
        
        const newProject: ProjectDraft = {
          id: file.name + '-' + Date.now(),
          title: file.name,
          lastModified: Date.now(),
          fontData,
          projectMetadata,
          projectSourceFormat,
        };
        
        await saveProject(newProject);
        if (newProject.fontData) {
          loadProjectState(
            newProject.id,
            newProject.title,
            newProject.fontData,
            newProject.projectMetadata,
            newProject.projectSourceFormat
          );
        }
      } catch (error: any) {
        console.error(error);
        alert(`讀取失敗: ${error.message || "未知解析錯誤"}`);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const handleOpenProject = async (project: ProjectDraft) => {
    const fullProject = await import('../lib/persistence').then(({ loadProject }) => loadProject(project.id));
    if (!fullProject?.fontData) {
      return;
    }
    loadProjectState(
      fullProject.id,
      fullProject.title,
      fullProject.fontData,
      fullProject.projectMetadata ?? null,
      fullProject.projectSourceFormat ?? null
    );
  };

  const handleDeleteProject = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('確定要永久刪除此字體專案草稿嗎？此動作無法復原。')) {
      try {
        await deleteProject(id);
        setProjects(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error(err);
        alert('刪除失敗');
      }
    }
  };

  return (
    <Box w="100vw" h="100vh" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
      <Box bg="white" p={8} borderRadius="lg" boxShadow="lg" w="100%" maxW="600px">
        <Heading size="lg" mb={6} textAlign="center">Kumiko Font Editor</Heading>
        
        <VStack spacing={6} align="stretch">
          <Box border="2px dashed" borderColor="gray.300" p={6} borderRadius="md" textAlign="center">
            <Heading size="sm" mb={4}>建立新專案</Heading>
            <Text fontSize="sm" color="gray.500" mb={4}>選擇本地端的 .glyphs 檔案開始編輯</Text>
            <Input type="file" accept=".glyphs" onChange={handleFileUpload} display="none" id="file-upload" />
            <Button as="label" htmlFor="file-upload" colorScheme="blue" cursor="pointer" isLoading={isLoading} loadingText="讀取與解析中...">
              選擇 .glyphs 檔案
            </Button>
            {isLoading && (
              <Text fontSize="xs" color="red.500" mt={2}>
                這是一個肥大檔案，網頁短暫無回應是正常的，請稍候...
              </Text>
            )}
          </Box>
          
          <Divider />
          
          <Box>
            <Heading size="sm" mb={4}>您最近開啟的字體專案 (IndexedDB)</Heading>
            {projects.length === 0 ? (
              <Text fontSize="sm" color="gray.500" textAlign="center">尚無任何專案紀錄</Text>
            ) : (
              <VStack align="stretch" spacing={2} maxHeight="300px" overflowY="auto">
                {projects.map(proj => (
                  <HStack key={proj.id} p={3} borderWidth={1} borderRadius="md" justify="space-between" _hover={{ bg: 'gray.50' }}>
                    <Box>
                      <Text fontWeight="bold">{proj.title}</Text>
                      <Text fontSize="xs" color="gray.500">{new Date(proj.lastModified).toLocaleString()}</Text>
                    </Box>
                    <HStack>
                      <Button size="sm" colorScheme="red" variant="ghost" onClick={(e) => handleDeleteProject(proj.id, e)}>刪除</Button>
                      <Button size="sm" onClick={() => handleOpenProject(proj)}>開啟此專案</Button>
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>
    </Box>
  );
}

function mapGlyphsToProjectData(raw: any): {
  fontData: FontData
  projectMetadata: Record<string, unknown>
  projectSourceFormat: 'glyphs'
} {
  const fontData: FontData = {
    glyphs: {},
    lineMetricsHorizontalLayout: getLineMetricsHorizontalLayout(raw),
  };
  const projectMetadata: Record<string, unknown> = {
    familyName: raw?.familyName ?? null,
    unitsPerEm: raw?.unitsPerEm ?? null,
    versionMajor: raw?.versionMajor ?? null,
    versionMinor: raw?.versionMinor ?? null,
    customParameters: raw?.customParameters ?? null,
    featurePrefixes: raw?.featurePrefixes ?? null,
    classes: raw?.classes ?? null,
    features: raw?.features ?? null,
    instances: raw?.instances ?? null,
    fontMasters: raw?.fontMaster ?? null,
  };

  const parseNumeric = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

  const getPathBounds = (paths: PathData[]) => {
    let xMin = Infinity;
    let xMax = -Infinity;

    for (const path of paths) {
      for (const node of path.nodes) {
        xMin = Math.min(xMin, node.x);
        xMax = Math.max(xMax, node.x);
      }
    }

    if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) {
      return null;
    }

    return { xMin, xMax };
  };

  const createMetricsFromPaths = (
    paths: PathData[],
    width: number,
    rawLsb: number | null,
    rawRsb: number | null
  ): GlyphMetrics => {
    const bounds = getPathBounds(paths);
    return {
      width,
      lsb: rawLsb ?? Math.round(bounds?.xMin ?? 0),
      rsb: rawRsb ?? Math.round(width - (bounds?.xMax ?? width)),
    };
  };

  const parseTransformNumbers = (value: unknown) => {
    if (Array.isArray(value)) {
      const numbers = value.map((item) => parseNumeric(item)).filter((item): item is number => item !== null);
      return numbers.length >= 6 ? numbers.slice(0, 6) : null;
    }

    if (typeof value === 'string') {
      const numbers = [...value.matchAll(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g)]
        .map((match) => Number.parseFloat(match[0]))
        .filter((item) => Number.isFinite(item));
      return numbers.length >= 6 ? numbers.slice(0, 6) : null;
    }

    return null;
  };

  const parseComponentRef = (component: any, index: number): GlyphComponentRef | null => {
    if (!component?.name) {
      return null;
    }

    const transform = parseTransformNumbers(component.transform);
    const x = transform?.[4] ?? parseNumeric(component.x) ?? parseNumeric(component.pos?.x) ?? 0;
    const y = transform?.[5] ?? parseNumeric(component.y) ?? parseNumeric(component.pos?.y) ?? 0;
    const scaleX = transform?.[0] ?? parseNumeric(component.scale?.x) ?? parseNumeric(component.scaleX) ?? 1;
    const scaleY = transform?.[3] ?? parseNumeric(component.scale?.y) ?? parseNumeric(component.scaleY) ?? 1;
    const rotation =
      parseNumeric(component.rotation) ??
      parseNumeric(component.angle) ??
      (transform ? Math.atan2(transform[1] ?? 0, transform[0] ?? 1) * (180 / Math.PI) : 0);

    return {
      id: component.id ?? `c${index}`,
      glyphId: component.name,
      x,
      y,
      scaleX,
      scaleY,
      rotation,
    };
  };

  const parseAnchors = (layer: any): GlyphAnchor[] =>
    Array.isArray(layer?.anchors)
      ? layer.anchors
          .map((anchor: any, index: number) => {
            const x = parseNumeric(anchor?.x);
            const y = parseNumeric(anchor?.y);
            if (x === null || y === null) {
              return null;
            }
            return {
              id: anchor?.id ?? `a${index}`,
              name: anchor?.name ?? `anchor-${index}`,
              x,
              y,
            };
          })
          .filter((anchor: GlyphAnchor | null): anchor is GlyphAnchor => anchor !== null)
      : [];

  const parseGuidelines = (layer: any): GlyphGuideline[] =>
    Array.isArray(layer?.guides || layer?.guidelines)
      ? (layer.guides || layer.guidelines)
          .map((guide: any, index: number) => {
            const x = parseNumeric(guide?.x) ?? 0;
            const y = parseNumeric(guide?.y) ?? 0;
            return {
              id: guide?.id ?? `g${index}`,
              x,
              y,
              angle: parseNumeric(guide?.angle) ?? 0,
              locked: Boolean(guide?.locked),
              name: guide?.name ?? undefined,
            };
          })
      : [];

  const parsePaths = (layer: any): PathData[] => {
    const paths: PathData[] = [];
    if (layer?.paths && Array.isArray(layer.paths)) {
      layer.paths.forEach((p: any, pIdx: number) => {
        const nodes: PathNode[] = [];
        if (p.nodes && Array.isArray(p.nodes)) {
          p.nodes.forEach((n: any) => {
            if (typeof n === 'string') {
              const parsedNode = parseGlyphsNode(n, nodes.length);
              if (parsedNode) {
                nodes.push(parsedNode);
              }
            }
          });
        }
        paths.push({ id: p.id ?? `p${pIdx}`, closed: p.closed !== 0, nodes });
      });
    }
    return paths;
  };

  const getLayerId = (layer: any, index: number) =>
    layer?.layerId ?? layer?.associatedMasterId ?? layer?.name ?? `layer_${index}`;

  const firstMasterId =
    Array.isArray(raw?.fontMaster) && raw.fontMaster.length > 0
      ? raw.fontMaster[0]?.id ?? null
      : null;

  if (raw && raw.glyphs && Array.isArray(raw.glyphs)) {
    raw.glyphs.forEach((g: any) => {
      const name = g.glyphname || 'unknown';
      const id = g.unicode ? `uni${g.unicode}` : name;

      const layerMap: Record<string, GlyphLayerData> = {};
      const layerOrder: string[] = [];
      if (Array.isArray(g.layers) && g.layers.length > 0) {
        g.layers.forEach((layer: any, layerIndex: number) => {
          const layerId = getLayerId(layer, layerIndex);
          const paths = parsePaths(layer);
          const componentRefs = Array.isArray(layer?.components)
            ? layer.components
                .map((component: any, componentIndex: number) =>
                  parseComponentRef(component, componentIndex)
                )
                .filter((component: GlyphComponentRef | null): component is GlyphComponentRef => component !== null)
            : [];
          const components = componentRefs.map((component: GlyphComponentRef) => component.glyphId);
          const width = parseNumeric(layer.width) ?? parseNumeric(g.width) ?? 1000;
          const rawLsb =
            parseNumeric(layer.LSB) ??
            parseNumeric(layer.lsb) ??
            parseNumeric(g.LSB) ??
            parseNumeric(g.lsb);
          const rawRsb =
            parseNumeric(layer.RSB) ??
            parseNumeric(layer.rsb) ??
            parseNumeric(g.RSB) ??
            parseNumeric(g.rsb);
          layerMap[layerId] = {
            id: layerId,
            name: layer?.name ?? layerId,
            associatedMasterId: layer?.associatedMasterId ?? null,
            paths,
            components,
            componentRefs,
            anchors: parseAnchors(layer),
            guidelines: parseGuidelines(layer),
            metrics: createMetricsFromPaths(paths, width, rawLsb, rawRsb),
          };
          layerOrder.push(layerId);
        });
      }

      const defaultLayerId =
        (firstMasterId && layerMap[firstMasterId] ? firstMasterId : null) ??
        layerOrder[0] ??
        null;
      const defaultLayer = defaultLayerId ? layerMap[defaultLayerId] : null;
      const fallbackWidth = parseNumeric(g.width) ?? 1000;
      const fallbackMetrics = createMetricsFromPaths([], fallbackWidth, null, null);

      fontData.glyphs[id] = {
        id,
        name,
        paths: defaultLayer?.paths ?? [],
        components: defaultLayer?.components ?? [],
        componentRefs: defaultLayer?.componentRefs ?? [],
        anchors: defaultLayer?.anchors ?? [],
        guidelines: defaultLayer?.guidelines ?? [],
        metrics: defaultLayer?.metrics ?? fallbackMetrics,
        layers: layerMap,
        layerOrder,
        unicode: g.unicode ? String(g.unicode) : null,
        export: g.export !== 0,
        category: g.category ?? null,
        subCategory: g.subCategory ?? null,
        production: g.production ?? null,
      };
    });
  }
  
  return {
    fontData,
    projectMetadata,
    projectSourceFormat: 'glyphs',
  };
}

function parseGlyphsNode(nodeString: string, index: number): PathNode | null {
  const parts = nodeString.trim().split(/\s+/);
  if (parts.length < 3) {
    return null;
  }

  const x = Number.parseFloat(parts[0]);
  const y = Number.parseFloat(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const typeToken = parts[2]?.toUpperCase();
  const isSmooth = parts.slice(3).some((part) => part.toUpperCase() === 'SMOOTH');

  let type: PathNode['type'];
  switch (typeToken) {
    case 'OFFCURVE':
      type = 'offcurve';
      break;
    case 'QCURVE':
      type = 'qcurve';
      break;
    case 'CURVE':
      type = isSmooth ? 'smooth' : 'corner';
      break;
    case 'LINE':
    default:
      type = isSmooth ? 'smooth' : 'corner';
      break;
  }

  return {
    id: `n${index}`,
    x,
    y,
    type,
  };
}

function getLineMetricsHorizontalLayout(raw: any) {
  const parseNumeric = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const firstMaster =
    Array.isArray(raw?.fontMaster) && raw.fontMaster.length > 0 ? raw.fontMaster[0] : null;

  const ascender = parseNumeric(firstMaster?.ascender) ?? parseNumeric(raw?.ascender) ?? 800;
  const descender = parseNumeric(firstMaster?.descender) ?? parseNumeric(raw?.descender) ?? -200;
  const capHeight = parseNumeric(firstMaster?.capHeight) ?? parseNumeric(raw?.capHeight);
  const xHeight = parseNumeric(firstMaster?.xHeight) ?? parseNumeric(raw?.xHeight);

  return {
    ascender: { value: ascender, zone: 16 },
    capHeight: { value: capHeight ?? ascender },
    xHeight: { value: xHeight ?? Math.round(ascender * 0.7) },
    baseline: { value: 0 },
    descender: { value: descender, zone: -16 },
  };
}
