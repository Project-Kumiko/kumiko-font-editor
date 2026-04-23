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
      bg="field.panel"
      borderRadius="sm"
    >
      <Heading size="sm" mb={3} textTransform="uppercase" color="field.ink">
        Metrics
      </Heading>
      <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={3}>
        <GridItem>
          <Text fontSize="xs" color="field.muted" mb={1} fontFamily="mono">
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
          <Text fontSize="xs" color="field.muted" mb={1} fontFamily="mono">
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
          <Text fontSize="xs" color="field.muted" mb={1} fontFamily="mono">
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
