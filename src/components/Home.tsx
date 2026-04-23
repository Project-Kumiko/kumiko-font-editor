import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Button,
  Collapse,
  Divider,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
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

  const handleGitHubImport = async () => {
    if (!githubRepoInput.trim() || isLoadingGitHub) {
      return
    }

    setIsLoadingGitHub(true)
    try {
      const importedProject = await importGitHubRepo({
        repo: githubRepoInput,
        ref: githubRefInput,
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
      alert(`讀取 GitHub 專案失敗: ${getErrorMessage(error)}`)
    } finally {
      setIsLoadingGitHub(false)
    }
  }

  useEffect(() => {
    if (hasAutoImportedFromUrlRef.current || isLoadingGitHub) {
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
    setTimeout(() => {
      void (async () => {
        setIsLoadingGitHub(true)
        try {
          const importedProject = await importGitHubRepo({
            repo,
            ref,
          })
          setProjects((current) => [
            importedProject.project,
            ...current.filter(
              (project) =>
                project.projectId !== importedProject.project.projectId
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
          alert(`自動載入 GitHub 專案失敗: ${getErrorMessage(error)}`)
        } finally {
          setIsLoadingGitHub(false)
        }
      })()
    }, 0)
  }, [isLoadingGitHub, loadProjectState, restorePersistedUfoChanges])

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
      h="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        p={8}
        borderRadius="lg"
        boxShadow="lg"
        w="100%"
        maxW="600px"
        bg="white"
      >
        <Heading size="lg" mb={6} textAlign="center">
          Kumiko Font Editor
        </Heading>

        <VStack spacing={6} align="stretch">
          <Box
            border="2px dashed"
            borderColor="gray.300"
            p={6}
            borderRadius="md"
            textAlign="center"
          >
            <Heading size="sm" mb={4}>
              建立新專案
            </Heading>
            <Text fontSize="sm" color="gray.500" mb={4}>
              選擇包含各種字重 `.ufo` 的上層資料夾開始編輯
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
              colorScheme="teal"
              cursor="pointer"
              isLoading={isLoadingLocal}
              loadingText="讀取與解析中..."
            >
              選擇 UFO 上層資料夾
            </Button>
            {isLoadingLocal && (
              <Text fontSize="xs" color="red.500" mt={2}>
                大型字庫在第一次匯入時需要一些時間，請稍候...
              </Text>
            )}
          </Box>

          <Box
            border="1px solid"
            borderColor="gray.200"
            p={6}
            borderRadius="md"
          >
            <Heading size="sm" mb={4}>
              從 GitHub 載入
            </Heading>
            <Text fontSize="sm" color="gray.500" mb={4}>
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
                    onChange={(event) => setGitHubRefInput(event.target.value)}
                    placeholder="branch、tag 或 commit（可留空）"
                  />
                </Box>
              </Collapse>
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
            <Heading size="sm" mb={4}>
              您最近開啟的字體專案 (IndexedDB)
            </Heading>
            {projects.length === 0 ? (
              <Text fontSize="sm" color="gray.500" textAlign="center">
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
                    borderWidth={1}
                    borderRadius="md"
                    justify="space-between"
                    _hover={{ bg: 'gray.50' }}
                  >
                    <Box>
                      <Text fontWeight="bold">{proj.title}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {proj.sourceType === 'github'
                          ? `GitHub: ${proj.githubSource?.owner}/${proj.githubSource?.repo}${proj.githubSource?.ref ? ` @ ${proj.githubSource.ref}` : ''}`
                          : `本地匯入: ${proj.sourceFolderName}`}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(proj.updatedAt).toLocaleString()}
                      </Text>
                    </Box>
                    <HStack>
                      <Button
                        size="sm"
                        colorScheme="red"
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
