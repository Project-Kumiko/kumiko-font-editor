import {
  Box,
  Button,
  HStack,
  IconButton,
  Tag,
  Text,
  VStack,
} from '@chakra-ui/react'
import { NavArrowDown, NavArrowRight } from 'iconoir-react'
import { useState } from 'react'
import type { GlyphOverviewTreeNode } from 'src/lib/glyphOverview'

interface OverviewTreeNavProps {
  nodes: GlyphOverviewTreeNode[]
  selectedSectionId: string
  onSectionSelect: (sectionId: string) => void
}

const DEFAULT_EXPANDED_NODE_IDS = ['type', 'script', 'custom']

const getNextExpandedIds = (expandedIds: string[], nodeId: string): string[] =>
  expandedIds.includes(nodeId)
    ? expandedIds.filter((id) => id !== nodeId)
    : [...expandedIds, nodeId]

function ExpandToggle({
  isExpanded,
  label,
  onToggle,
}: {
  isExpanded: boolean
  label: string
  onToggle: () => void
}) {
  const Icon = isExpanded ? NavArrowDown : NavArrowRight

  return (
    <IconButton
      aria-label={isExpanded ? `收合 ${label}` : `展開 ${label}`}
      icon={<Icon width={20} height={20} strokeWidth={2.25} />}
      size="xs"
      variant="ghost"
      minW="22px"
      w="22px"
      h="28px"
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    />
  )
}

function TreeIndentSpacer() {
  return <Box w="22px" flexShrink={0} />
}

function OverviewTreeRow({
  depth,
  isExpanded,
  isSelected,
  node,
  onSectionSelect,
  onToggle,
}: {
  depth: number
  isExpanded: boolean
  isSelected: boolean
  node: GlyphOverviewTreeNode
  onSectionSelect: (sectionId: string) => void
  onToggle: (sectionId: string) => void
}) {
  const hasChildren = Boolean(node.children?.length)

  return (
    <HStack spacing={0} pl={depth * 2.5}>
      {hasChildren ? (
        <ExpandToggle
          isExpanded={isExpanded}
          label={node.label}
          onToggle={() => onToggle(node.id)}
        />
      ) : (
        <TreeIndentSpacer />
      )}
      <Button
        flex={1}
        justifyContent="space-between"
        minW={0}
        ml={0.5}
        pl={2}
        size="sm"
        variant={isSelected ? 'solid' : 'ghost'}
        color="field.ink"
        fontWeight="900"
        onClick={() => onSectionSelect(node.id)}
      >
        <Text noOfLines={1}>{node.label}</Text>
        <Tag size="sm">{node.glyphs.length}</Tag>
      </Button>
    </HStack>
  )
}

function OverviewTreeBranch({
  depth,
  expandedIds,
  node,
  selectedSectionId,
  onSectionSelect,
  onToggle,
}: {
  depth: number
  expandedIds: string[]
  node: GlyphOverviewTreeNode
  selectedSectionId: string
  onSectionSelect: (sectionId: string) => void
  onToggle: (sectionId: string) => void
}) {
  const isExpanded = expandedIds.includes(node.id)

  return (
    <Box>
      <OverviewTreeRow
        depth={depth}
        isExpanded={isExpanded}
        isSelected={selectedSectionId === node.id}
        node={node}
        onSectionSelect={onSectionSelect}
        onToggle={onToggle}
      />
      {isExpanded &&
        node.children?.map((child) => (
          <OverviewTreeBranch
            key={child.id}
            depth={depth + 1}
            expandedIds={expandedIds}
            node={child}
            selectedSectionId={selectedSectionId}
            onSectionSelect={onSectionSelect}
            onToggle={onToggle}
          />
        ))}
    </Box>
  )
}

export function OverviewTreeNav({
  nodes,
  selectedSectionId,
  onSectionSelect,
}: OverviewTreeNavProps) {
  const [expandedIds, setExpandedIds] = useState(DEFAULT_EXPANDED_NODE_IDS)
  const handleToggle = (nodeId: string) => {
    setExpandedIds((current) => getNextExpandedIds(current, nodeId))
  }

  return (
    <VStack align="stretch" spacing={1}>
      {nodes.map((node) => (
        <OverviewTreeBranch
          key={node.id}
          depth={0}
          expandedIds={expandedIds}
          node={node}
          selectedSectionId={selectedSectionId}
          onSectionSelect={onSectionSelect}
          onToggle={handleToggle}
        />
      ))}
    </VStack>
  )
}
