import { Box } from '@chakra-ui/react'
import { forwardRef, type HTMLAttributes } from 'react'

export const OverviewGridList = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function OverviewGridList(props, ref) {
  return (
    <Box
      ref={ref}
      display="grid"
      gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))"
      gap={3}
      {...props}
    />
  )
})

OverviewGridList.displayName = 'OverviewGridList'

export function OverviewGridItem(props: HTMLAttributes<HTMLDivElement>) {
  return <Box {...props} />
}
