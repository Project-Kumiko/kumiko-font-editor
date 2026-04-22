import { Box, Grid, GridItem, Heading, Input, Text } from '@chakra-ui/react'
import type { GlyphMetrics } from '../../store'

interface MetricsCardProps {
  displayedMetrics: GlyphMetrics | null | undefined
  onMetricsChange: (field: 'lsb' | 'rsb' | 'width', value: string) => void
}

export function MetricsCard({
  displayedMetrics,
  onMetricsChange,
}: MetricsCardProps) {
  return (
    <Box
      p={4}
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="blackAlpha.100"
    >
      <Heading size="sm" mb={3}>
        Metrics
      </Heading>
      <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={3}>
        <GridItem>
          <Text fontSize="xs" color="gray.500" mb={1}>
            LSB
          </Text>
          <Input
            size="sm"
            type="number"
            value={displayedMetrics?.lsb ?? 0}
            onChange={(event) => onMetricsChange('lsb', event.target.value)}
          />
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="gray.500" mb={1}>
            Width
          </Text>
          <Input
            size="sm"
            type="number"
            value={displayedMetrics?.width ?? 0}
            onChange={(event) => onMetricsChange('width', event.target.value)}
          />
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="gray.500" mb={1}>
            RSB
          </Text>
          <Input
            size="sm"
            type="number"
            value={displayedMetrics?.rsb ?? 0}
            onChange={(event) => onMetricsChange('rsb', event.target.value)}
          />
        </GridItem>
      </Grid>
    </Box>
  )
}
