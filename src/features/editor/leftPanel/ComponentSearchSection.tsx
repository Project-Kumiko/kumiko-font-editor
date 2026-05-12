import { Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

interface ComponentSearchSectionProps {
  components: string[]
  loading: boolean
  selectedComponent: string | null
  onSelectComponent: (component: string) => void
}

export function ComponentSearchSection({
  components,
  loading,
  selectedComponent,
  onSelectComponent,
}: ComponentSearchSectionProps) {
  const { t } = useTranslation()

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="sm" color="field.muted" fontFamily="mono">
        {t('editor.decompositionComponents')}
      </Text>
      <HStack spacing={2} flexWrap="wrap">
        {loading && components.length === 0 ? (
          <HStack spacing={2}>
            <Spinner size="sm" color="field.yellow.400" />
            <Text fontSize="sm" color="field.muted">
              {t('editor.analyzing')}
            </Text>
          </HStack>
        ) : components.length > 0 ? (
          components.map((component) => (
            <Button
              key={component}
              size="sm"
              variant={component === selectedComponent ? 'solid' : 'outline'}
              fontFamily="glyph"
              onClick={() => onSelectComponent(component)}
            >
              {component}
            </Button>
          ))
        ) : (
          <Text fontSize="sm" color="field.muted">
            {t('editor.noComponentsAvailable')}
          </Text>
        )}
      </HStack>
    </VStack>
  )
}
