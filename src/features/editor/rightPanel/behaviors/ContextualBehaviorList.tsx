import {
  Badge,
  Box,
  HStack,
  IconButton,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { MinusCircle, PlusCircle } from 'iconoir-react'
import type {
  ContextualBehaviorDraft,
  ContextualBehaviorRow,
} from 'src/lib/openTypeFeatures'
import { ContextualBehaviorTableRow } from 'src/features/editor/rightPanel/behaviors/ContextualBehaviorTableRow'
import { useTranslation } from 'react-i18next'

interface ContextualBehaviorListProps {
  rows: ContextualBehaviorRow[]
  draftRowIds: string[]
  currentGlyphId: string
  onAddDraftRow: () => void
  onCommit: (draft: ContextualBehaviorDraft) => void
  onDelete: (row: ContextualBehaviorRow) => void
  onDraftCommitted: (rowId: string) => void
}

export function ContextualBehaviorList({
  rows,
  draftRowIds,
  currentGlyphId,
  onAddDraftRow,
  onCommit,
  onDelete,
  onDraftCommitted,
}: ContextualBehaviorListProps) {
  const { t } = useTranslation()

  return (
    <Stack spacing={2}>
      <HStack justify="space-between" align="center">
        <HStack spacing={2}>
          <Text fontSize="sm" fontWeight="semibold">
            {t('editor.contextual')}
          </Text>
          <Badge colorScheme="gray">{rows.length}</Badge>
        </HStack>
        <HStack spacing={1}>
          <Tooltip label={t('editor.addContextualRule')}>
            <IconButton
              aria-label={t('editor.addContextualRule')}
              icon={<PlusCircle width={17} height={17} aria-hidden="true" />}
              size="xs"
              variant="ghost"
              onClick={onAddDraftRow}
            />
          </Tooltip>
          <Tooltip label={t('editor.removeTheLastDraftRow')}>
            <IconButton
              aria-label={t('editor.removeLastContextualDraft')}
              icon={<MinusCircle width={17} height={17} aria-hidden="true" />}
              size="xs"
              variant="ghost"
              isDisabled={draftRowIds.length === 0}
              onClick={() => onDraftCommitted(draftRowIds.at(-1) ?? '')}
            />
          </Tooltip>
        </HStack>
      </HStack>

      <Box borderWidth="1px" borderColor="field.line" bg="field.panel">
        {rows.length === 0 && draftRowIds.length === 0 ? (
          <Text fontSize="xs" color="field.muted" px={3} py={3}>
            {t('editor.noContextualRulesForThisGlyph')}
          </Text>
        ) : null}
        {rows.map((row) => (
          <ContextualBehaviorTableRow
            key={getContextualRowKey(row)}
            row={row}
            onCommit={onCommit}
            onDelete={() => onDelete(row)}
          />
        ))}
        {draftRowIds.map((rowId) => (
          <ContextualBehaviorTableRow
            key={rowId}
            rowId={rowId}
            currentGlyphId={currentGlyphId}
            onCommit={onCommit}
            onDelete={() => onDraftCommitted(rowId)}
            onDraftCommitted={() => onDraftCommitted(rowId)}
          />
        ))}
      </Box>
    </Stack>
  )
}

function getContextualRowKey(row: ContextualBehaviorRow) {
  return [
    row.id,
    row.before,
    row.source,
    row.after,
    row.replacement,
    row.sourceLabel,
  ].join(':')
}
