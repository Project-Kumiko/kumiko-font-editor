import { Stack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import {
  deriveGlyphAlternateBehaviors,
  deriveGlyphCombinationBehaviors,
} from 'src/lib/openTypeFeatures'
import { useStore, type FontData, type GlyphData } from 'src/store'
import { CombinationBehaviorList } from 'src/features/editor/rightPanel/behaviors/CombinationBehaviorList'
import { BehaviorPlaceholderSections } from 'src/features/editor/rightPanel/behaviors/BehaviorPlaceholderSections'
import { AlternateBehaviorList } from 'src/features/editor/rightPanel/behaviors/AlternateBehaviorList'

interface BehaviorsPanelProps {
  fontData: FontData | null
  glyph: GlyphData
}

export function BehaviorsPanel({ fontData, glyph }: BehaviorsPanelProps) {
  const [draftRowIds, setDraftRowIds] = useState<string[]>([])
  const [alternateDraftRowIds, setAlternateDraftRowIds] = useState<string[]>([])
  const upsertCombinationBehavior = useStore(
    (state) => state.upsertCombinationBehavior
  )
  const deleteCombinationBehavior = useStore(
    (state) => state.deleteCombinationBehavior
  )
  const upsertAlternateBehavior = useStore(
    (state) => state.upsertAlternateBehavior
  )
  const deleteAlternateBehavior = useStore(
    (state) => state.deleteAlternateBehavior
  )
  const addGlyphToEditor = useStore((state) => state.addGlyphToEditor)
  const setSelectedGlyphId = useStore((state) => state.setSelectedGlyphId)
  const setWorkspaceView = useStore((state) => state.setWorkspaceView)

  const combinationRows = useMemo(
    () => (fontData ? deriveGlyphCombinationBehaviors(fontData, glyph.id) : []),
    [fontData, glyph.id]
  )
  const alternateRows = useMemo(
    () => (fontData ? deriveGlyphAlternateBehaviors(fontData, glyph.id) : []),
    [fontData, glyph.id]
  )

  const openGlyph = (glyphId: string) => {
    if (!fontData?.glyphs[glyphId]) return
    addGlyphToEditor(glyphId)
    setSelectedGlyphId(glyphId)
    setWorkspaceView('editor')
  }

  return (
    <Stack spacing={4}>
      <CombinationBehaviorList
        draftRowIds={draftRowIds}
        rows={combinationRows}
        onAddDraftRow={() =>
          setDraftRowIds((rowIds) => [...rowIds, `draft-${Date.now()}`])
        }
        onCommit={(draft) => upsertCombinationBehavior(draft)}
        onDelete={(row) => deleteCombinationBehavior(row.lookupId, row.ruleId)}
        onDraftCommitted={(rowId) =>
          setDraftRowIds((rowIds) => rowIds.filter((id) => id !== rowId))
        }
        onOpenGlyph={openGlyph}
      />
      <AlternateBehaviorList
        currentGlyphId={glyph.id}
        draftRowIds={alternateDraftRowIds}
        rows={alternateRows}
        onAddDraftRow={() =>
          setAlternateDraftRowIds((rowIds) => [
            ...rowIds,
            `alternate-draft-${Date.now()}`,
          ])
        }
        onCommit={(draft) => upsertAlternateBehavior(draft)}
        onDelete={(row) =>
          deleteAlternateBehavior(row.lookupId, row.ruleId, row.alternate)
        }
        onDraftCommitted={(rowId) =>
          setAlternateDraftRowIds((rowIds) =>
            rowIds.filter((id) => id !== rowId)
          )
        }
        onOpenGlyph={openGlyph}
      />
      <BehaviorPlaceholderSections />
    </Stack>
  )
}
