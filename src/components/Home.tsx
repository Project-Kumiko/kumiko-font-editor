import { useState, useEffect, useRef } from 'react';
import {
  Avatar,
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  clearStoredGitHubAccessToken,
  fetchGitHubViewer,
  getStoredGitHubAccessToken,
  pollGitHubDeviceFlow,
  setStoredGitHubAccessToken,
  startGitHubDeviceFlow,
  type GitHubDeviceStartPayload,
  type GitHubViewer,
} from '../lib/githubAuth';
import { importGitHubRepo } from '../lib/githubImport';
import { deleteUfoProjectData, listUfoProjects } from '../lib/ufoPersistence';
import { importUfoWorkspace, loadUfoProjectIntoFontData } from '../lib/ufoFormat';
import { useStore } from '../store';
import type { UfoProjectRecord } from '../lib/ufoTypes';

export function Home() {
  const loadProjectState = useStore(state => state.loadProjectState);
  const [projects, setProjects] = useState<UfoProjectRecord[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isLoadingGitHub, setIsLoadingGitHub] = useState(false);
  const [isStartingGitHubLogin, setIsStartingGitHubLogin] = useState(false);
  const [githubDeviceFlow, setGitHubDeviceFlow] = useState<GitHubDeviceStartPayload | null>(null);
  const [githubAccessToken, setGitHubAccessToken] = useState<string | null>(null);
  const [githubViewer, setGitHubViewer] = useState<GitHubViewer | null>(null);
  const [githubAuthStatus, setGitHubAuthStatus] = useState<string | null>(null);
  const [githubRepoInput, setGitHubRepoInput] = useState('akira02/jieyuan-rounded-font');
  const [githubRefInput, setGitHubRefInput] = useState('');
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

  useEffect(() => {
    const token = getStoredGitHubAccessToken();
    if (!token) {
      return;
    }
    setGitHubAccessToken(token);
  }, []);

  useEffect(() => {
    if (!githubAccessToken) {
      setGitHubViewer(null);
      return;
    }

    let isCancelled = false;
    fetchGitHubViewer(githubAccessToken)
      .then((viewer) => {
        if (!isCancelled) {
          setGitHubViewer(viewer);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!isCancelled) {
          clearStoredGitHubAccessToken();
          setGitHubAccessToken(null);
          setGitHubViewer(null);
          setGitHubAuthStatus('GitHub 登入已失效，請重新登入。');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [githubAccessToken]);

  useEffect(() => {
    if (!githubDeviceFlow) {
      return;
    }

    let isCancelled = false;
    let timeoutId: number | null = null;
    const startedAt = Date.now();
    const expiresAt = startedAt + githubDeviceFlow.expires_in * 1000;

    const schedulePoll = (delayMs: number) => {
      timeoutId = window.setTimeout(async () => {
        try {
          const result = await pollGitHubDeviceFlow(githubDeviceFlow.device_code);
          if (isCancelled) {
            return;
          }

          if (result.status === 'authorized') {
            setStoredGitHubAccessToken(result.accessToken);
            setGitHubAccessToken(result.accessToken);
            setGitHubDeviceFlow(null);
            setGitHubAuthStatus('GitHub 已登入，可以使用較高的 API 配額與後續 PR 流程。');
            return;
          }

          if (result.status === 'authorization_pending' || result.status === 'slow_down') {
            setGitHubAuthStatus(
              result.status === 'slow_down'
                ? 'GitHub 要求放慢輪詢速度，正在重試...'
                : '等待你在 GitHub 完成授權...'
            );
            if (Date.now() >= expiresAt) {
              setGitHubDeviceFlow(null);
              setGitHubAuthStatus('這組 Device Code 已過期，請重新開始登入。');
              return;
            }
            schedulePoll((result.interval ?? githubDeviceFlow.interval) * 1000);
            return;
          }

          setGitHubDeviceFlow(null);
          setGitHubAuthStatus(result.message);
        } catch (error: unknown) {
          console.error(error);
          if (!isCancelled) {
            setGitHubDeviceFlow(null);
            setGitHubAuthStatus(getErrorMessage(error));
          }
        }
      }, delayMs);
    };

    setGitHubAuthStatus('等待你在 GitHub 完成授權...');
    schedulePoll(githubDeviceFlow.interval * 1000);

    return () => {
      isCancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [githubDeviceFlow]);

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : '未知錯誤';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    void handlePackageUpload(event);
  };

  const handlePackageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
    if (selectedFiles.length === 0) {
      return;
    }

    setIsLoadingLocal(true);

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
      } catch (error: unknown) {
        console.error(error);
        alert(`讀取 UFO 資料夾失敗: ${getErrorMessage(error)}`);
      } finally {
        setIsLoadingLocal(false);
        event.target.value = '';
      }
    }, 100);
  };

  const handleGitHubImport = async () => {
    if (!githubRepoInput.trim() || isLoadingGitHub) {
      return;
    }

    setIsLoadingGitHub(true);
    try {
      const importedProject = await importGitHubRepo({
        repo: githubRepoInput,
        ref: githubRefInput,
        accessToken: githubAccessToken,
      });
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
    } catch (error: unknown) {
      console.error(error);
      alert(`讀取 GitHub 專案失敗: ${getErrorMessage(error)}`);
    } finally {
      setIsLoadingGitHub(false);
    }
  };

  const handleStartGitHubLogin = async () => {
    if (isStartingGitHubLogin) {
      return;
    }

    setIsStartingGitHubLogin(true);
    try {
      const flow = await startGitHubDeviceFlow();
      setGitHubDeviceFlow(flow);
      setGitHubAuthStatus('請到 GitHub 輸入代碼完成授權。');
    } catch (error: unknown) {
      console.error(error);
      setGitHubAuthStatus(getErrorMessage(error));
    } finally {
      setIsStartingGitHubLogin(false);
    }
  };

  const handleLogoutGitHub = () => {
    clearStoredGitHubAccessToken();
    setGitHubAccessToken(null);
    setGitHubViewer(null);
    setGitHubDeviceFlow(null);
    setGitHubAuthStatus('已清除本機保存的 GitHub token。');
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
            <Button as="label" htmlFor="package-upload" colorScheme="teal" cursor="pointer" isLoading={isLoadingLocal} loadingText="讀取與解析中...">
              選擇 UFO 上層資料夾
            </Button>
            {isLoadingLocal && (
              <Text fontSize="xs" color="red.500" mt={2}>
                大型字庫在第一次匯入時需要一些時間，請稍候...
              </Text>
            )}
          </Box>

          <Box border="1px solid" borderColor="gray.200" p={6} borderRadius="md">
            <Heading size="sm" mb={4}>GitHub 登入</Heading>
            {githubViewer ? (
              <HStack justify="space-between" align="center" mb={4}>
                <HStack spacing={3}>
                  <Avatar size="sm" name={githubViewer.name ?? githubViewer.login ?? undefined} src={githubViewer.avatarUrl ?? undefined} />
                  <Box>
                    <Text fontWeight="medium">{githubViewer.name || githubViewer.login}</Text>
                    <Text fontSize="xs" color="gray.500">
                      @{githubViewer.login}
                    </Text>
                  </Box>
                </HStack>
                <Button size="sm" variant="ghost" onClick={handleLogoutGitHub}>
                  登出
                </Button>
              </HStack>
            ) : (
              <VStack spacing={3} align="stretch" mb={4}>
                <Text fontSize="sm" color="gray.500">
                  先登入可以提高 GitHub API 配額，也方便之後直接 fork、commit 和發 PR。
                </Text>
                <Button
                  colorScheme="gray"
                  onClick={() => void handleStartGitHubLogin()}
                  isLoading={isStartingGitHubLogin}
                  loadingText="啟動中..."
                >
                  使用 GitHub Device Flow 登入
                </Button>
              </VStack>
            )}
            {githubDeviceFlow && (
              <Box bg="gray.50" borderRadius="md" p={4} mb={4}>
                <Text fontSize="sm" mb={2}>
                  1. 前往 <Text as="span" fontFamily="mono">{githubDeviceFlow.verification_uri}</Text>
                </Text>
                <Text fontSize="sm" mb={2}>
                  2. 輸入代碼 <Text as="span" fontFamily="mono" fontWeight="bold">{githubDeviceFlow.user_code}</Text>
                </Text>
                <Text fontSize="xs" color="gray.500">
                  授權完成後，這個頁面會自動偵測登入成功。
                </Text>
              </Box>
            )}
            {githubAuthStatus && (
              <Text fontSize="xs" color="gray.600" mb={4}>
                {githubAuthStatus}
              </Text>
            )}
          </Box>

          <Box border="1px solid" borderColor="gray.200" p={6} borderRadius="md">
            <Heading size="sm" mb={4}>從 GitHub 載入</Heading>
            <Text fontSize="sm" color="gray.500" mb={4}>
              輸入 `owner/repo` 或 GitHub URL。若不填 branch / tag，會自動使用預設分支。登入後會優先用授權 token 請求 GitHub。
            </Text>
            <VStack spacing={3} align="stretch">
              <Input
                value={githubRepoInput}
                onChange={(event) => setGitHubRepoInput(event.target.value)}
                placeholder="akira02/jieyuan-rounded-font"
              />
              <Input
                value={githubRefInput}
                onChange={(event) => setGitHubRefInput(event.target.value)}
                placeholder="branch、tag 或 commit（可留空）"
              />
              <Button
                colorScheme="blue"
                onClick={() => void handleGitHubImport()}
                isLoading={isLoadingGitHub}
                loadingText="下載與解析中..."
              >
                載入 GitHub 專案
              </Button>
            </VStack>
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
                      <Text fontSize="xs" color="gray.500">
                        {proj.sourceType === 'github'
                          ? `GitHub: ${proj.githubSource?.owner}/${proj.githubSource?.repo}${proj.githubSource?.ref ? ` @ ${proj.githubSource.ref}` : ''}`
                          : `本地匯入: ${proj.sourceFolderName}`}
                      </Text>
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
