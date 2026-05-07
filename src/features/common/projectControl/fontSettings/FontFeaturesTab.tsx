import { FormControl, FormLabel, Textarea } from '@chakra-ui/react'

interface FontFeaturesTabProps {
  featuresText: string
  onFeaturesTextChange: (value: string) => void
}

export function FontFeaturesTab({
  featuresText,
  onFeaturesTextChange,
}: FontFeaturesTabProps) {
  return (
    <FormControl>
      <FormLabel fontSize="sm">OpenType feature code</FormLabel>
      <Textarea
        minH="520px"
        fontFamily="mono"
        value={featuresText}
        onChange={(event) => onFeaturesTextChange(event.target.value)}
        placeholder={`languagesystem DFLT dflt;\n\nfeature liga {\n  sub f i by fi;\n} liga;`}
      />
    </FormControl>
  )
}
