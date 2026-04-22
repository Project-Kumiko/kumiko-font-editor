import { Box, Button, Heading, Stack } from '@chakra-ui/react'

interface ProjectSaveCardProps {
  canSaveDraft: boolean
  canSaveLocal: boolean
  hasUfoSource: boolean
  isSavingToLocal: boolean
  loadingText: string
  onSaveLocal: () => void
  onSaveProject: () => void
}

export function ProjectSaveCard({
  canSaveDraft,
  canSaveLocal,
  hasUfoSource,
  isSavingToLocal,
  loadingText,
  onSaveLocal,
  onSaveProject,
}: ProjectSaveCardProps) {
  return (
    <Box
      p={4}
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="blackAlpha.100"
    >
      <Stack spacing={3}>
        <Heading size="sm">專案儲存</Heading>
        {hasUfoSource ? (
          <>
            <Button
              colorScheme="blue"
              onClick={onSaveLocal}
              isDisabled={!canSaveLocal}
              isLoading={isSavingToLocal}
              loadingText={loadingText}
            >
              儲存至本地
            </Button>
            <Button
              variant="outline"
              onClick={onSaveProject}
              isDisabled={!canSaveDraft || isSavingToLocal}
            >
              儲存草稿
            </Button>
          </>
        ) : (
          <>
            <Button
              colorScheme="blue"
              onClick={onSaveProject}
              isDisabled={!canSaveDraft}
            >
              儲存目前專案
            </Button>
            <Button
              variant="outline"
              onClick={onSaveProject}
              isDisabled={!canSaveDraft}
            >
              儲存草稿
            </Button>
          </>
        )}
      </Stack>
    </Box>
  )
}
