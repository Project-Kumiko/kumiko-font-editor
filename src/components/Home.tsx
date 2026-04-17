import { useState, useEffect } from 'react';
import { Box, Button, Heading, Text, VStack, Input, HStack, Divider } from '@chakra-ui/react';
import { parseOpenStep } from '../lib/openstepParser';
import { useStore } from '../store';
import type { FontData, PathData, PathNode } from '../store';
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
        const fontData = mapGlyphsToFontData(parsed);
        
        const newProject: ProjectDraft = {
          id: file.name + '-' + Date.now(),
          title: file.name,
          lastModified: Date.now(),
          fontData
        };
        
        await saveProject(newProject);
        loadProjectState(newProject.id, newProject.title, newProject.fontData);
      } catch (error: any) {
        console.error(error);
        alert(`讀取失敗: ${error.message || "未知解析錯誤"}`);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const handleOpenProject = (project: ProjectDraft) => {
    loadProjectState(project.id, project.title, project.fontData);
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

function mapGlyphsToFontData(raw: any): FontData {
  const fontData: FontData = {
    glyphs: {},
    lineMetricsHorizontalLayout: getLineMetricsHorizontalLayout(raw),
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

  if (raw && raw.glyphs && Array.isArray(raw.glyphs)) {
    raw.glyphs.forEach((g: any) => {
      const name = g.glyphname || 'unknown';
      const id = g.unicode ? `uni${g.unicode}` : name;
      
      const paths: PathData[] = [];
      const components: string[] = [];
      
      if (g.layers && Array.isArray(g.layers) && g.layers.length > 0) {
        const layer = g.layers[0];
        
        if (layer.paths && Array.isArray(layer.paths)) {
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
             paths.push({ id: `p${pIdx}`, closed: p.closed !== 0, nodes });
           });
        }
        
        if (layer.components && Array.isArray(layer.components)) {
           layer.components.forEach((c: any) => {
             if (c.name) components.push(c.name);
           });
        }

        const layerWidth = parseNumeric(layer.width);
        const glyphWidth = parseNumeric(g.width);
        const width = layerWidth ?? glyphWidth ?? 1000;
        const lsb = 60;
        const rsb = 60;

        fontData.glyphs[id] = {
          id,
          name,
          paths,
          components,
          componentRefs: [],
          metrics: {
            width,
            lsb,
            rsb,
          },
        };
        return;
      }

      fontData.glyphs[id] = { id, name, paths, components, componentRefs: [], metrics: { width: 1000, lsb: 60, rsb: 60 } };
    });
  }
  
  return fontData;
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
