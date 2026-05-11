import { SimpleGrid } from '@chakra-ui/react'
import type { SinglePositioningRule } from 'src/lib/openTypeFeatures'
import { GlyphSelectorFields } from 'src/features/common/projectControl/fontSettings/features/GlyphSelectorFields'
import { ValueRecordFields } from 'src/features/common/projectControl/fontSettings/features/ValueRecordFields'

interface SinglePositioningRuleEditorProps {
  rule: SinglePositioningRule
  onChange: (rule: SinglePositioningRule) => void
}

export function SinglePositioningRuleEditor({
  rule,
  onChange,
}: SinglePositioningRuleEditorProps) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
      <GlyphSelectorFields
        label="Target"
        value={rule.target}
        onChange={(target) => onChange({ ...rule, target })}
      />
      <ValueRecordFields
        label="Value"
        value={rule.value}
        onChange={(value) => onChange({ ...rule, value: value ?? {} })}
      />
    </SimpleGrid>
  )
}
