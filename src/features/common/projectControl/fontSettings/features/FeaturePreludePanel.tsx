import {
  Badge,
  FormControl,
  FormLabel,
  HStack,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import type { OpenTypeFeaturesState } from 'src/lib/openTypeFeatures'

interface FeaturePreludePanelProps {
  featuresText: string
  state: OpenTypeFeaturesState
  onFeaturesTextChange: (value: string) => void
}

export function FeaturePreludePanel({
  featuresText,
  state,
  onFeaturesTextChange,
}: FeaturePreludePanelProps) {
  return (
    <Stack spacing={4}>
      <Stack spacing={2}>
        <Text fontWeight="semibold">Prelude</Text>
        <Text fontSize="sm" color="field.muted">
          Language systems and imported feature source live here. Generated FEA
          remains disposable output.
        </Text>
      </Stack>

      <Stack spacing={2}>
        <Text fontSize="xs" color="field.muted">
          Language systems
        </Text>
        <HStack wrap="wrap">
          {state.languagesystems.map((languageSystem) => (
            <Badge key={languageSystem.id} fontFamily="mono">
              {languageSystem.script} {languageSystem.language}
            </Badge>
          ))}
        </HStack>
      </Stack>

      <FormControl>
        <FormLabel fontSize="sm">Imported or legacy feature text</FormLabel>
        <Textarea
          minH="220px"
          fontFamily="mono"
          value={featuresText}
          onChange={(event) => onFeaturesTextChange(event.target.value)}
          placeholder={`languagesystem DFLT dflt;\n\nfeature liga {\n  sub f i by fi;\n} liga;`}
        />
      </FormControl>
    </Stack>
  )
}
