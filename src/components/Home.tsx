import { useState, useEffect, useRef } from 'react';
import { Box, Button, Heading, Text, VStack, Input, HStack, Divider } from '@chakra-ui/react';
import { deleteUfoProjectData, listUfoProjects } from '../lib/ufoPersistence';
import { importUfoWorkspace, loadUfoProjectIntoFontData } from '../lib/ufoFormat';
import { useStore } from '../store';
import type { UfoProjectRecord } from '../lib/ufoTypes';

export function Home() {
  const loadProjectState = useStore(state => state.loadProjectState);
  const [projects, setProjects] = useState<UfoProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const packageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    listUfoProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (!packageInputRef.current) {
      return;
    }
    packageInputRef.current.setAttribute('webkitdirectory', '');
    packageInputRef.current.setAttribute('directory', '');
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    void handlePackageUpload(event);
  };

  const handlePackageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
    if (selectedFiles.length === 0) {
      return;
    }

    setIsLoading(true);

    setTimeout(async () => {
      try {
        const importedProject = await importUfoWorkspace(selectedFiles);
        setProjects((current) => [
          importedProject.project,
          ...current.filter((project) => project.projectId !== importedProject.project.projectId),
        ]);
        loadProjectState(
          importedProject.project.projectId,
          importedProject.project.title,
          importedProject.fontData,
          importedProject.projectMetadata,
          importedProject.projectSourceFormat
        );
      } catch (error: any) {
        console.error(error);
        alert(`讀取 UFO 資料夾失敗: ${error.message || '未知解析錯誤'}`);
      } finally {
        setIsLoading(false);
        event.target.value = '';
      }
    }, 100);
  };

  const handleOpenProject = async (project: UfoProjectRecord) => {
    const loadedProject = await loadUfoProjectIntoFontData(project.projectId);
    if (!loadedProject) {
      return;
    }
    loadProjectState(
      loadedProject.project.projectId,
      loadedProject.project.title,
      loadedProject.fontData,
      loadedProject.projectMetadata,
      'ufo'
    );
  };

  const handleDeleteProject = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('確定要永久刪除此字體專案草稿嗎？此動作無法復原。')) {
      try {
        await deleteUfoProjectData(id);
        setProjects(prev => prev.filter(p => p.projectId !== id));
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
            <Text fontSize="sm" color="gray.500" mb={4}>選擇包含各種字重 `.ufo` 的上層資料夾開始編輯</Text>
            <Input type="file" onChange={handleFileUpload} display="none" id="file-upload" />
            <input
              ref={packageInputRef}
              type="file"
              multiple
              onChange={handlePackageUpload}
              style={{ display: 'none' }}
              id="package-upload"
            />
            <Button as="label" htmlFor="package-upload" colorScheme="teal" cursor="pointer" isLoading={isLoading} loadingText="讀取與解析中...">
              選擇 UFO 上層資料夾
            </Button>
            {isLoading && (
              <Text fontSize="xs" color="red.500" mt={2}>
                大型字庫在第一次匯入時需要一些時間，請稍候...
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
                  <HStack key={proj.projectId} p={3} borderWidth={1} borderRadius="md" justify="space-between" _hover={{ bg: 'gray.50' }}>
                    <Box>
                      <Text fontWeight="bold">{proj.title}</Text>
                      <Text fontSize="xs" color="gray.500">{new Date(proj.updatedAt).toLocaleString()}</Text>
                    </Box>
                    <HStack>
                      <Button size="sm" colorScheme="red" variant="ghost" onClick={(e) => handleDeleteProject(proj.projectId, e)}>刪除</Button>
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
