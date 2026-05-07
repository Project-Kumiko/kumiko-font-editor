import { Box, Button, Heading, Stack } from '@chakra-ui/react'

interface ProjectSaveCardProps {
  canSaveDraft: boolean
  hasGitHubSource: boolean
  isSavingToLocal: boolean
  onOpenExportModal: () => void
  onOpenGitHubModal: () => void
  onSaveProject: () => void
}

export function ProjectSaveCard({
  canSaveDraft,
  hasGitHubSource,
  isSavingToLocal,
  onOpenExportModal,
  onOpenGitHubModal,
  onSaveProject,
}: ProjectSaveCardProps) {
  return (
    <Box p={4} bg="field.panel" borderRadius="sm">
      <Stack spacing={3}>
        <Heading size="sm" textTransform="uppercase" color="field.ink">
          專案儲存
        </Heading>
        <Button
          variant="outline"
          onClick={onOpenExportModal}
          isDisabled={isSavingToLocal}
        >
          匯出字型
        </Button>
        <Button
          onClick={onSaveProject}
          isDisabled={!canSaveDraft || isSavingToLocal}
        >
          儲存
        </Button>
        {hasGitHubSource ? (
          <Button variant="outline" onClick={onOpenGitHubModal}>
            GitHub / Commit
          </Button>
        ) : null}
      </Stack>
    </Box>
  )
}
