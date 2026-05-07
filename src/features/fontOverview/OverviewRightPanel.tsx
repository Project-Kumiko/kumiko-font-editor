import { Box, Stack, Text, useDisclosure } from '@chakra-ui/react'
import { ExportFontModal } from '../common/fontExport/ExportFontModal'
import { useFontExport } from '../common/fontExport/useFontExport'
import { GitHubCommitModal } from '../common/glyphInspector/GitHubCommitModal'
import { GlyphSummaryCard } from '../common/glyphInspector/GlyphSummaryCard'
import { ProjectSaveCard } from '../common/glyphInspector/ProjectSaveCard'
import { useRightPanelModel } from '../common/glyphInspector/useRightPanelModel'

export function OverviewRightPanel() {
  const panel = useRightPanelModel()
  const exportModal = useDisclosure()
  const fontExport = useFontExport()

  return (
    <Box
      p={4}
      h="100%"
      overflowY="auto"
      bg="field.paper"
      backgroundSize="26px 26px"
      backgroundRepeat="repeat"
    >
      <Stack spacing={4}>
        {!panel.glyph ? (
          <Text fontSize="sm" color="field.muted" fontFamily="mono">
            尚未選取字形。
          </Text>
        ) : (
          <GlyphSummaryCard
            activeLayer={panel.activeLayer ?? null}
            availableLayers={panel.availableLayers}
            glyph={panel.glyph}
            isDirty={panel.isDirty}
            selectedLayerId={panel.selectedLayerId}
            workspaceView={panel.workspaceView}
            onDeleteGlyph={panel.handleDeleteGlyph}
            onEnterEditor={() => panel.setWorkspaceView('editor')}
            onLayerChange={panel.setSelectedLayerId}
          />
        )}

        <ProjectSaveCard
          canSaveDraft={Boolean(
            panel.fontData &&
            panel.projectId &&
            panel.projectTitle &&
            panel.isDirty
          )}
          hasUfoSource={panel.hasUfoSource}
          hasGitHubSource={panel.hasGitHubSource}
          isSavingToLocal={fontExport.isExporting}
          onOpenExportModal={exportModal.onOpen}
          onOpenGitHubModal={() =>
            void panel.gitHubCommitFlow.openGitHubModal()
          }
          onSaveProject={panel.handleSaveProject}
        />
      </Stack>

      <ExportFontModal
        isOpen={exportModal.isOpen}
        canExport={fontExport.canExport}
        isExporting={fontExport.isExporting}
        loadingText={fontExport.loadingText}
        onClose={exportModal.onClose}
        onExport={(format) => void fontExport.exportFont(format)}
      />
      <GitHubCommitModal {...panel.gitHubCommitFlow.modalProps} />
    </Box>
  )
}
