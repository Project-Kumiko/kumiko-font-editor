import { Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react'

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
  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="sm" color="gray.600">
        拆字部件
      </Text>
      <HStack spacing={2} flexWrap="wrap">
        {loading && components.length === 0 ? (
          <HStack spacing={2}>
            <Spinner size="sm" color="teal.500" />
            <Text fontSize="sm" color="gray.500">
              分析中
            </Text>
          </HStack>
        ) : components.length > 0 ? (
          components.map((component) => (
            <Button
              key={component}
              size="sm"
              variant={component === selectedComponent ? 'solid' : 'outline'}
              colorScheme="teal"
              onClick={() => onSelectComponent(component)}
            >
              {component}
            </Button>
          ))
        ) : (
          <Text fontSize="sm" color="gray.500">
            找不到可用的拆字部件。
          </Text>
        )}
      </HStack>
    </VStack>
  )
}
