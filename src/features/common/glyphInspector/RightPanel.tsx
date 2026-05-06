import { Box, Stack, Text, useDisclosure } from '@chakra-ui/react'
import { ExportFontModal } from '../fontExport/ExportFontModal'
import { useFontExport } from '../fontExport/useFontExport'
import { GitHubCommitModal } from './GitHubCommitModal'
import { GlyphSummaryCard } from './GlyphSummaryCard'
import { MetricsCard } from './MetricsCard'
import { NodeInspectorCard } from './NodeInspectorCard'
import { ProjectSaveCard } from './ProjectSaveCard'
import { useRightPanelModel } from './useRightPanelModel'

export function RightPanel() {
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
      <Stack spacing={5}>
        {!panel.glyph ? (
          <Text fontSize="sm" color="field.muted" fontFamily="mono">
            尚未選取字形。
          </Text>
        ) : (
          <Stack spacing={4}>
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

            <NodeInspectorCard
              effectiveNodeType={panel.effectiveNodeType}
              isEndpointNode={panel.isEndpointNode}
              isOnCurveNode={panel.isOnCurveNode}
              nodeRef={panel.nodeRef}
              selectedNode={panel.selectedNode ?? null}
              selectedSegment={panel.selectedSegment}
              onCoordinateChange={panel.handleCoordinateChange}
              onConvertSelectedSegment={panel.handleConvertSelectedSegment}
              onNodeTypeChange={panel.handleNodeTypeChange}
            />

            <MetricsCard
              displayedMetrics={panel.displayedMetrics}
              onMetricsChange={panel.handleMetricsChange}
            />
          </Stack>
        )}
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
