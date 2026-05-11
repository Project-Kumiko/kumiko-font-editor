import { Stack } from '@chakra-ui/react'
import type { PairPositioningRule } from 'src/lib/openTypeFeatures'
import { GlyphSelectorFields } from 'src/features/common/projectControl/fontSettings/features/GlyphSelectorFields'
import { ValueRecordFields } from 'src/features/common/projectControl/fontSettings/features/ValueRecordFields'

interface PairPositioningRuleEditorProps {
  rule: PairPositioningRule
  onChange: (rule: PairPositioningRule) => void
}

export function PairPositioningRuleEditor({
  rule,
  onChange,
}: PairPositioningRuleEditorProps) {
  return (
    <Stack spacing={3}>
      <GlyphSelectorFields
        label="Left"
        value={rule.left}
        onChange={(left) => onChange({ ...rule, left })}
      />
      <GlyphSelectorFields
        label="Right"
        value={rule.right}
        onChange={(right) => onChange({ ...rule, right })}
      />
      <ValueRecordFields
        label="First value"
        value={rule.firstValue}
        onChange={(firstValue) => onChange({ ...rule, firstValue })}
      />
      <ValueRecordFields
        label="Second value"
        value={rule.secondValue}
        onChange={(secondValue) => onChange({ ...rule, secondValue })}
      />
    </Stack>
  )
}
