import { FormControl, FormLabel, Stack, Textarea } from '@chakra-ui/react'

interface FontSupplementalTabProps {
  notes: string
  supplementalText: string
  onNotesChange: (value: string) => void
  onSupplementalTextChange: (value: string) => void
}

export function FontSupplementalTab({
  notes,
  supplementalText,
  onNotesChange,
  onSupplementalTextChange,
}: FontSupplementalTabProps) {
  return (
    <Stack spacing={4}>
      <FormControl>
        <FormLabel fontSize="sm">Notes</FormLabel>
        <Textarea
          minH="180px"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </FormControl>
      <FormControl>
        <FormLabel fontSize="sm">補充</FormLabel>
        <Textarea
          minH="260px"
          value={supplementalText}
          onChange={(event) => onSupplementalTextChange(event.target.value)}
        />
      </FormControl>
    </Stack>
  )
}
