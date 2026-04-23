import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Button,
  Collapse,
  Divider,
  Heading,
  HStack,
  Image,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  Grid,
  Flex,
} from '@chakra-ui/react'
import logoUrl from '../assets/logo.svg'
import { importGitHubRepo } from '../lib/githubImport'
import {
  deleteUfoProjectData,
  listDirtyUfoGlyphs,
  listUfoProjects,
  loadUfoUiValue,
} from '../lib/ufoPersistence'
import {
  importUfoWorkspace,
  loadUfoProjectIntoFontData,
} from '../lib/ufoFormat'
import { useStore } from '../store'
import type { UfoProjectRecord } from '../lib/ufoTypes'
import { UFO_LOCAL_DELETED_GLYPHS_KEY } from '../lib/draftSave'

interface PendingGitHubImport {
  repo: string
  ref: string
  repoUrl: string | null
}

const getGitHubRepoUrl = (repoInput: string) => {
  const normalized = repoInput
    .trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git\/?$/, '')
    .replace(/\/$/, '')
  const [owner, repo] = normalized.split('/')

  if (!owner || !repo) {
    return null
  }

  return `https://github.com/${owner}/${repo}`
}

export function Home() {
  const loadProjectState = useStore((state) => state.loadProjectState)
  const hydratePersistedLocalChanges = useStore(
    (state) => state.hydratePersistedLocalChanges
  )
  const [projects, setProjects] = useState<UfoProjectRecord[]>([])
  const [isLoadingLocal, setIsLoadingLocal] = useState(false)
  const [isLoadingGitHub, setIsLoadingGitHub] = useState(false)
  const [githubRepoInput, setGitHubRepoInput] = useState('')
  const [githubRefInput, setGitHubRefInput] = useState('')
  const [showGitHubRefInput, setShowGitHubRefInput] = useState(false)
  const [pendingGitHubImport, setPendingGitHubImport] =
    useState<PendingGitHubImport | null>(null)
  const packageInputRef = useRef<HTMLInputElement | null>(null)
  const hasAutoImportedFromUrlRef = useRef(false)

  useEffect(() => {
    listUfoProjects().then(setProjects).catch(console.error)
  }, [])

  useEffect(() => {
    if (!packageInputRef.current) {
      return
    }
    packageInputRef.current.setAttribute('webkitdirectory', '')
    packageInputRef.current.setAttribute('directory', '')
  }, [])

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : '未知錯誤'

  const clearGitHubUrlParams = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('repo')
    url.searchParams.delete('ref')
    window.history.replaceState({}, '', url.toString())
  }

  const restorePersistedUfoChanges = useCallback(
    async (projectId: string) => {
      const dirtyGlyphs = await listDirtyUfoGlyphs(projectId)
      const deletedGlyphIds =
        (await loadUfoUiValue<string[]>(
          projectId,
          UFO_LOCAL_DELETED_GLYPHS_KEY
        )) ?? []
      hydratePersistedLocalChanges(
        dirtyGlyphs.map((glyph) => glyph.glyphName),
        deletedGlyphIds
      )
    },
    [hydratePersistedLocalChanges]
  )

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    void handlePackageUpload(event)
  }

  const handlePackageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = event.target.files
      ? Array.from(event.target.files)
      : []
    if (selectedFiles.length === 0) {
      return
    }

    setIsLoadingLocal(true)

    setTimeout(async () => {
      try {
        const importedProject = await importUfoWorkspace(selectedFiles)
        setProjects((current) => [
          importedProject.project,
          ...current.filter(
            (project) => project.projectId !== importedProject.project.projectId
          ),
        ])
        loadProjectState(
          importedProject.project.projectId,
          importedProject.project.title,
          importedProject.fontData,
          importedProject.projectMetadata,
          importedProject.projectSourceFormat
        )
      } catch (error: unknown) {
        console.error(error)
        alert(`讀取 UFO 資料夾失敗: ${getErrorMessage(error)}`)
      } finally {
        setIsLoadingLocal(false)
        event.target.value = ''
      }
    }, 100)
  }

  const importGitHubProject = useCallback(
    async (input: { repo: string; ref: string; errorLabel: string }) => {
      if (!input.repo.trim() || isLoadingGitHub) {
        return
      }

      setIsLoadingGitHub(true)
      try {
        const importedProject = await importGitHubRepo({
          repo: input.repo,
          ref: input.ref,
        })
        setProjects((current) => [
          importedProject.project,
          ...current.filter(
            (project) => project.projectId !== importedProject.project.projectId
          ),
        ])
        loadProjectState(
          importedProject.project.projectId,
          importedProject.project.title,
          importedProject.fontData,
          importedProject.projectMetadata,
          importedProject.projectSourceFormat
        )
        await restorePersistedUfoChanges(importedProject.project.projectId)
        clearGitHubUrlParams()
      } catch (error: unknown) {
        console.error(error)
        alert(`${input.errorLabel}: ${getErrorMessage(error)}`)
      } finally {
        setIsLoadingGitHub(false)
      }
    },
    [isLoadingGitHub, loadProjectState, restorePersistedUfoChanges]
  )

  const handleGitHubImport = async () => {
    if (!githubRepoInput.trim()) {
      return
    }

    await importGitHubProject({
      repo: githubRepoInput,
      ref: githubRefInput,
      errorLabel: '讀取 GitHub 專案失敗',
    })
  }

  const handleCancelPendingGitHubImport = () => {
    setPendingGitHubImport(null)
    clearGitHubUrlParams()
  }

  const handleConfirmPendingGitHubImport = async () => {
    if (!pendingGitHubImport) {
      return
    }

    const { repo, ref } = pendingGitHubImport
    setPendingGitHubImport(null)
    await importGitHubProject({
      repo,
      ref,
      errorLabel: '載入 GitHub 專案失敗',
    })
  }

  useEffect(() => {
    if (hasAutoImportedFromUrlRef.current) {
      return
    }

    const url = new URL(window.location.href)
    const repo = url.searchParams.get('repo')?.trim()
    const ref = url.searchParams.get('ref')?.trim() ?? ''

    if (!repo) {
      return
    }

    hasAutoImportedFromUrlRef.current = true
    setGitHubRepoInput(repo)
    setGitHubRefInput(ref)
    setShowGitHubRefInput(Boolean(ref))
    setPendingGitHubImport({
      repo,
      ref,
      repoUrl: getGitHubRepoUrl(repo),
    })
  }, [])

  const handleOpenProject = async (project: UfoProjectRecord) => {
    const loadedProject = await loadUfoProjectIntoFontData(project.projectId)
    if (!loadedProject) {
      return
    }
    loadProjectState(
      loadedProject.project.projectId,
      loadedProject.project.title,
      loadedProject.fontData,
      loadedProject.projectMetadata,
      'ufo'
    )
    await restorePersistedUfoChanges(loadedProject.project.projectId)
  }

  const handleDeleteProject = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (window.confirm('確定要永久刪除此字體專案草稿嗎？此動作無法復原。')) {
      try {
        await deleteUfoProjectData(id)
        setProjects((prev) => prev.filter((p) => p.projectId !== id))
      } catch (err) {
        console.error(err)
        alert('刪除失敗')
      }
    }
  }

  return (
    <Box
      w="100vw"
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: 4, md: 8 }}
      py={{ base: 6, md: 10 }}
      bg="field.paper"
      backgroundImage="var(--field-plus-pattern)"
      backgroundSize="26px 26px"
      backgroundRepeat="repeat"
    >
      <Modal
        isOpen={Boolean(pendingGitHubImport)}
        onClose={handleCancelPendingGitHubImport}
        isCentered
      >
        <ModalOverlay />
        <ModalContent borderRadius="sm">
          <ModalHeader>載入 GitHub 專案</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="sm" color="field.muted">
                是否要載入以下 GitHub 專案？
              </Text>
              <Box
                border="1px solid"
                borderColor="field.line"
                borderRadius="sm"
                bg="field.paper"
                p={4}
              >
                <Text fontSize="xs" color="field.muted" fontFamily="mono">
                  Repository
                </Text>

                {pendingGitHubImport?.repoUrl && (
                  <Box
                    fontSize="lg"
                    color="black"
                    wordBreak="break-all"
                    textTransform="uppercase"
                  >
                    <Box fontWeight="800">
                      {pendingGitHubImport?.repo.split('/')[0] ||
                        pendingGitHubImport?.repo}
                      /
                    </Box>
                    <Link
                      display="inline-block"
                      href={pendingGitHubImport.repoUrl}
                      isExternal
                      fontWeight="900"
                      fontSize="25px"
                    >
                      {pendingGitHubImport?.repo.split('/')[1] ||
                        pendingGitHubImport?.repo}
                    </Link>
                  </Box>
                )}
                <Text
                  mt={3}
                  fontSize="xs"
                  color="field.muted"
                  fontFamily="mono"
                >
                  Ref
                </Text>
                <Text fontWeight="700" wordBreak="break-all">
                  {pendingGitHubImport?.ref || '預設 branch'}
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button
              variant="ghost"
              onClick={handleCancelPendingGitHubImport}
              isDisabled={isLoadingGitHub}
            >
              取消
            </Button>
            <Button
              onClick={() => void handleConfirmPendingGitHubImport()}
              isLoading={isLoadingGitHub}
              loadingText="下載與解析中..."
            >
              載入專案
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Box
        p={{ base: 5, md: 8 }}
        borderRadius="sm"
        boxShadow="lg"
        w="100%"
        maxW="880px"
        bg="field.panel"
        position="relative"
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          h: '7px',
          bg: 'field.yellow.400',
          borderBottom: '1px solid',
          borderColor: 'field.ink',
        }}
      >
        <HStack mt={4} mb={8} align="center" spacing={{ base: 4, md: 6 }}>
          <Image
            src={logoUrl}
            alt="Kumiko Font Editor"
            boxSize={{ base: '72px', md: '112px' }}
            flexShrink={0}
            mt="15px"
          />
          <Box minW={0}>
            <Text
              fontFamily="mono"
              fontSize="10px"
              fontWeight="900"
              letterSpacing="0.16em"
              color="field.muted"
            >
              BORDER TOOL / TYPE SYSTEM / LOCAL DRAFT TERMINAL
            </Text>
            <Heading
              mt={1}
              fontSize={{ base: '46px', md: '76px' }}
              lineHeight="0.82"
              letterSpacing="0"
              color="field.ink"
            >
              Kumiko
              <br />
              Font Editor
            </Heading>
          </Box>
        </HStack>

        <VStack spacing={6} align="stretch">
          <Grid templateColumns="1fr 1fr" gap={6}>
            <Flex
              border="1px dashed"
              borderColor="field.line"
              p={6}
              borderRadius="sm"
              bg="field.paper"
              direction="column"
              justifyContent="center"
            >
              <Heading size="sm" mb={2} textTransform="uppercase">
                本地匯入
              </Heading>
              <Text fontSize="sm" color="field.muted" mb={4}>
                請選擇包含各種字重 `.ufo` 的上層資料夾
              </Text>
              <Input
                type="file"
                onChange={handleFileUpload}
                display="none"
                id="file-upload"
              />
              <input
                ref={packageInputRef}
                type="file"
                multiple
                onChange={handlePackageUpload}
                style={{ display: 'none' }}
                id="package-upload"
              />
              <Button
                as="label"
                htmlFor="package-upload"
                cursor="pointer"
                isLoading={isLoadingLocal}
                loadingText="讀取與解析中..."
              >
                選擇 UFO 上層資料夾
              </Button>
              {isLoadingLocal && (
                <Text
                  fontSize="xs"
                  color="field.red.500"
                  mt={3}
                  fontFamily="mono"
                >
                  大型字庫在第一次匯入時需要一些時間，請稍候...
                </Text>
              )}
            </Flex>

            <Box
              border="1px solid"
              borderColor="field.line"
              p={6}
              borderRadius="sm"
              bg="field.panel"
            >
              <Heading size="sm" mb={2} textTransform="uppercase">
                從 GitHub 載入
              </Heading>
              <Text fontSize="sm" color="field.muted" mb={4}>
                輸入 `owner/repo` 或 GitHub URL。
              </Text>
              <VStack spacing={3} align="stretch">
                <Input
                  value={githubRepoInput}
                  onChange={(event) => setGitHubRepoInput(event.target.value)}
                  placeholder="owner/repo"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  alignSelf="flex-start"
                  onClick={() => setShowGitHubRefInput((current) => !current)}
                  rightIcon={
                    <Text
                      as="span"
                      fontSize="sm"
                      transform={
                        showGitHubRefInput ? 'rotate(180deg)' : 'rotate(0deg)'
                      }
                      transition="transform 0.2s ease"
                    >
                      ▾
                    </Text>
                  }
                >
                  {showGitHubRefInput
                    ? '收合 branch / tag / commit'
                    : '指定 branch / tag / commit'}
                </Button>
                <Collapse in={showGitHubRefInput} animateOpacity>
                  <Box>
                    <Input
                      value={githubRefInput}
                      onChange={(event) =>
                        setGitHubRefInput(event.target.value)
                      }
                      placeholder="branch、tag 或 commit（可留空）"
                    />
                  </Box>
                </Collapse>
                <Button
                  onClick={() => void handleGitHubImport()}
                  isLoading={isLoadingGitHub}
                  loadingText="下載與解析中..."
                >
                  載入 GitHub 專案
                </Button>
              </VStack>
            </Box>
          </Grid>

          <Divider borderColor="field.line" />

          <Box>
            <Heading size="sm" mb={4}>
              您最近開啟的字體專案 (IndexedDB)
            </Heading>
            {projects.length === 0 ? (
              <Text fontSize="sm" color="field.muted" textAlign="center">
                尚無任何專案紀錄
              </Text>
            ) : (
              <VStack
                align="stretch"
                spacing={2}
                maxHeight="300px"
                overflowY="auto"
              >
                {projects.map((proj) => (
                  <HStack
                    key={proj.projectId}
                    p={3}
                    border="1px solid"
                    borderColor="field.line"
                    borderRadius="sm"
                    justify="space-between"
                    bg="field.paper"
                    _hover={{ bg: 'field.yellow.300' }}
                  >
                    <Box>
                      <Text fontWeight="900" fontSize="lg">
                        {proj.title}
                      </Text>
                      <Text fontSize="xs" color="field.muted" fontFamily="mono">
                        {proj.sourceType === 'github'
                          ? `GitHub: ${proj.githubSource?.owner}/${proj.githubSource?.repo}${proj.githubSource?.ref ? ` @ ${proj.githubSource.ref}` : ''}`
                          : `本地匯入: ${proj.sourceFolderName}`}
                      </Text>
                      <Text fontSize="xs" color="field.muted" fontFamily="mono">
                        {new Date(proj.updatedAt).toLocaleString()}
                      </Text>
                    </Box>
                    <HStack>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteProject(proj.projectId, e)}
                      >
                        刪除
                      </Button>
                      <Button size="sm" onClick={() => handleOpenProject(proj)}>
                        開啟此專案
                      </Button>
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>
    </Box>
  )
}
