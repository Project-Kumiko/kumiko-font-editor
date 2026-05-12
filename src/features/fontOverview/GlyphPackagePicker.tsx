import {
  Badge,
  Box,
  Button,
  Grid,
  GridItem,
  HStack,
  Link,
  SimpleGrid,
  Stack,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { Plus } from 'iconoir-react'
import { useEffect, useMemo, useState } from 'react'
import {
  defaultGlyphPackages,
  type DefaultGlyphPackage,
  type GlyphPackageGroup,
} from 'src/features/fontOverview/defaultGlyphPackages'
import { useTranslation } from 'react-i18next'

interface GlyphPackagePickerProps {
  existingGlyphIds: Set<string>
  onSelectionChange: (selection: GlyphPackageSelection) => void
}

export interface GlyphPackageSelection {
  glyphNames: string[]
  existingCount: number
  missingGlyphNames: string[]
  packages: DefaultGlyphPackage[]
}

const getPackageGlyphNames = (packages: DefaultGlyphPackage[]) => {
  const glyphNames = new Set<string>()
  for (const glyphPackage of packages) {
    for (const glyphName of glyphPackage.glyphNames) {
      glyphNames.add(glyphName)
    }
  }
  return glyphNames
}

const packageGroups: Array<{ id: GlyphPackageGroup; label: string }> = [
  { id: 'zh-jf7000', label: '繁體中文' },
  { id: 'latin', label: '拉丁字母' },
  { id: 'japanese', label: '日文' },
  { id: 'symbols', label: '符號' },
]

const groupLabelById = new Map(
  packageGroups.map((group) => [group.id, group.label])
)

const firstPackageGroupId = packageGroups[0]?.id ?? 'zh-jf7000'

const getPackagesBySection = (packages: DefaultGlyphPackage[]) => {
  const sections = new Map<string, DefaultGlyphPackage[]>()
  for (const glyphPackage of packages) {
    const sectionPackages = sections.get(glyphPackage.section) ?? []
    sectionPackages.push(glyphPackage)
    sections.set(glyphPackage.section, sectionPackages)
  }
  return Array.from(sections)
}

interface PackageCardProps {
  glyphPackage: DefaultGlyphPackage
  isSelected: boolean
  onToggle: () => void
}

function PackageCard({ glyphPackage, isSelected, onToggle }: PackageCardProps) {
  const { t } = useTranslation()

  const selectedBg = 'field.ink'
  const selectedColor = 'field.yellow.300'
  const mutedColor = isSelected ? 'field.panelMuted' : 'field.muted'

  return (
    <Button
      h="auto"
      minH="116px"
      justifyContent="center"
      alignItems="center"
      whiteSpace="normal"
      variant="outline"
      borderWidth={2}
      borderColor={isSelected ? 'field.ink' : 'field.haze'}
      bg={isSelected ? selectedBg : 'white'}
      color={isSelected ? selectedColor : 'field.ink'}
      _hover={{
        bg: isSelected ? selectedBg : 'field.panel',
        borderColor: 'field.ink',
        color: isSelected ? selectedColor : 'field.ink',
      }}
      _active={{
        bg: isSelected ? selectedBg : 'field.panel',
        color: isSelected ? selectedColor : 'field.ink',
      }}
      _focusVisible={{ boxShadow: '0 0 0 2px var(--chakra-colors-field-ink)' }}
      onClick={onToggle}
      p={3}
      position="relative"
    >
      <Stack spacing={2} align="center" textAlign="center" w="100%">
        <Stack spacing={1} align="center">
          <Text fontWeight="bold" lineHeight="1.1">
            {glyphPackage.label}
          </Text>
          {isSelected && (
            <Badge
              bg="field.yellow.300"
              color="field.ink"
              variant="solid"
              top={1}
              right={1}
              fontSize="0.625rem"
              position="absolute"
            >
              {t('fontOverview.selected')}
            </Badge>
          )}
        </Stack>
        <Text fontSize="xs" color={mutedColor} fontWeight="normal">
          {glyphPackage.description}
        </Text>
        <Text fontSize="xs" color={mutedColor} fontFamily="mono">
          {glyphPackage.glyphNames.length.toLocaleString()}{' '}
          {t('fontOverview.glyphs')}
        </Text>
      </Stack>
    </Button>
  )
}

interface PackageGroupSidebarProps {
  activeGroupId: GlyphPackageGroup
  onSelectGroup: (groupId: GlyphPackageGroup) => void
}

function PackageGroupSidebar({
  activeGroupId,
  onSelectGroup,
}: PackageGroupSidebarProps) {
  return (
    <Stack spacing={2}>
      {packageGroups.map((group) => {
        const isActive = activeGroupId === group.id
        return (
          <Button
            key={group.id}
            justifyContent="flex-start"
            variant="outline"
            bg={isActive ? 'field.ink' : 'field.panelMuted'}
            color={isActive ? 'field.yellow.300' : 'field.ink'}
            borderColor={isActive ? 'field.ink' : 'transparent'}
            _hover={{
              bg: isActive ? 'field.ink' : 'field.panel',
              color: isActive ? 'field.yellow.300' : 'field.ink',
              borderColor: 'field.ink',
            }}
            onClick={() => onSelectGroup(group.id)}
          >
            {group.label}
          </Button>
        )
      })}
    </Stack>
  )
}

interface PackageGroupSourceProps {
  groupId: GlyphPackageGroup
}

function PackageGroupSource({ groupId }: PackageGroupSourceProps) {
  const { t } = useTranslation()

  if (groupId !== 'zh-jf7000') {
    return null
  }

  return (
    <Text fontSize="xs" color="field.muted">
      {t('fontOverview.sourceLabel')}
      <Link
        href="https://justfont.com/jf7000"
        isExternal
        fontWeight="900"
        color="field.ink"
        textDecoration="underline"
      >
        {t('fontOverview.jf7000Package')}
      </Link>
    </Text>
  )
}

interface PackageCardSectionProps {
  section: string
  sectionPackages: DefaultGlyphPackage[]
  selectedPackageIds: Set<string>
  onTogglePackage: (glyphPackage: DefaultGlyphPackage) => void
}

function PackageCardSection({
  section,
  sectionPackages,
  selectedPackageIds,
  onTogglePackage,
}: PackageCardSectionProps) {
  return (
    <Stack spacing={2}>
      <Text
        fontSize="xs"
        color="field.muted"
        fontFamily="mono"
        fontWeight="900"
      >
        {section}
      </Text>
      <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={2}>
        {sectionPackages.map((glyphPackage) => (
          <PackageCard
            key={glyphPackage.id}
            glyphPackage={glyphPackage}
            isSelected={selectedPackageIds.has(glyphPackage.id)}
            onToggle={() => onTogglePackage(glyphPackage)}
          />
        ))}
      </SimpleGrid>
    </Stack>
  )
}

interface PackageCardsAreaProps {
  packages: DefaultGlyphPackage[]
  selectedPackageIds: Set<string>
  onTogglePackage: (glyphPackage: DefaultGlyphPackage) => void
}

function PackageCardsArea({
  packages,
  selectedPackageIds,
  onTogglePackage,
}: PackageCardsAreaProps) {
  return (
    <Stack spacing={3} w="100%">
      {getPackagesBySection(packages).map(([section, sectionPackages]) => (
        <PackageCardSection
          key={section}
          section={section}
          sectionPackages={sectionPackages}
          selectedPackageIds={selectedPackageIds}
          onTogglePackage={onTogglePackage}
        />
      ))}
    </Stack>
  )
}

interface SummaryTokenProps {
  glyphPackage: DefaultGlyphPackage
}

function SummaryToken({ glyphPackage }: SummaryTokenProps) {
  return (
    <HStack
      spacing={0}
      border="2px solid"
      borderColor="field.ink"
      borderRadius="2px"
      overflow="hidden"
    >
      <Text
        px={2}
        py={1}
        bg="white"
        color="field.ink"
        fontSize="xs"
        fontWeight="900"
        whiteSpace="nowrap"
      >
        {groupLabelById.get(glyphPackage.group) ?? glyphPackage.group}
      </Text>
      <Text
        px={2}
        py={1}
        bg="field.ink"
        color="white"
        fontSize="xs"
        fontWeight="900"
        whiteSpace="nowrap"
      >
        {glyphPackage.label}
      </Text>
    </HStack>
  )
}

interface SummaryFormulaProps {
  packages: DefaultGlyphPackage[]
}

function SummaryFormula({ packages }: SummaryFormulaProps) {
  const { t } = useTranslation()

  if (packages.length === 0) {
    return (
      <Text fontSize="sm" color="field.muted">
        {t('fontOverview.noneSelected')}
      </Text>
    )
  }

  return (
    <Wrap spacing={2} align="center">
      {packages.map((glyphPackage, index) => (
        <WrapItem key={glyphPackage.id} alignItems="center">
          <HStack spacing={2}>
            {index > 0 && <Plus width={16} height={16} />}
            <SummaryToken glyphPackage={glyphPackage} />
          </HStack>
        </WrapItem>
      ))}
    </Wrap>
  )
}

interface GlyphPackageSelectionSummaryProps {
  selection: GlyphPackageSelection
}

export function GlyphPackageSelectionSummary({
  selection,
}: GlyphPackageSelectionSummaryProps) {
  const { t } = useTranslation()

  return (
    <Box minW={0}>
      <SummaryFormula packages={selection.packages} />
      <Text fontSize="xl" fontWeight={500} color="field.steel" mt={2}>
        {t('fontOverview.total')}
        <Box as="span" fontWeight={700} mx={1}>
          {selection.glyphNames.length.toLocaleString()}
        </Box>
        {t('fontOverview.glyphExists')}
        <Box as="span" fontWeight={700} mx={1}>
          {selection.existingCount.toLocaleString()}
        </Box>
        {t('fontOverview.glyphWillBeAdded')}
        <Box as="span" fontWeight={800} mx={1}>
          {selection.missingGlyphNames.length.toLocaleString()}
        </Box>
        {t('fontOverview.glyph')}
      </Text>
    </Box>
  )
}

export function GlyphPackagePicker({
  existingGlyphIds,
  onSelectionChange,
}: GlyphPackagePickerProps) {
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(
    () => new Set(['zh-basic'])
  )
  const [activeGroupId, setActiveGroupId] =
    useState<GlyphPackageGroup>(firstPackageGroupId)
  const packageById = useMemo(
    () =>
      new Map(
        defaultGlyphPackages.map((glyphPackage) => [
          glyphPackage.id,
          glyphPackage,
        ])
      ),
    []
  )
  const selectedPackages = useMemo(
    () =>
      defaultGlyphPackages.filter((glyphPackage) =>
        selectedPackageIds.has(glyphPackage.id)
      ),
    [selectedPackageIds]
  )
  const selectedGlyphNames = useMemo(
    () => getPackageGlyphNames(selectedPackages),
    [selectedPackages]
  )
  const missingGlyphNames = useMemo(
    () =>
      Array.from(selectedGlyphNames).filter(
        (glyphName) => !existingGlyphIds.has(glyphName)
      ),
    [existingGlyphIds, selectedGlyphNames]
  )
  useEffect(() => {
    onSelectionChange({
      glyphNames: Array.from(selectedGlyphNames),
      existingCount: selectedGlyphNames.size - missingGlyphNames.length,
      missingGlyphNames,
      packages: selectedPackages,
    })
  }, [
    missingGlyphNames,
    onSelectionChange,
    selectedGlyphNames,
    selectedPackages,
  ])

  const addDependencies = (
    nextSelectedIds: Set<string>,
    glyphPackage: DefaultGlyphPackage
  ) => {
    nextSelectedIds.add(glyphPackage.id)
    for (const dependencyId of glyphPackage.dependsOn) {
      const dependency = packageById.get(dependencyId)
      if (dependency) {
        addDependencies(nextSelectedIds, dependency)
      }
    }
  }

  const removeDependents = (
    nextSelectedIds: Set<string>,
    removedPackageId: string
  ) => {
    nextSelectedIds.delete(removedPackageId)
    for (const glyphPackage of defaultGlyphPackages) {
      if (
        nextSelectedIds.has(glyphPackage.id) &&
        glyphPackage.dependsOn.includes(removedPackageId)
      ) {
        removeDependents(nextSelectedIds, glyphPackage.id)
      }
    }
  }

  const togglePackage = (glyphPackage: DefaultGlyphPackage) => {
    setSelectedPackageIds((current) => {
      const nextSelectedIds = new Set(current)
      if (nextSelectedIds.has(glyphPackage.id)) {
        removeDependents(nextSelectedIds, glyphPackage.id)
      } else {
        addDependencies(nextSelectedIds, glyphPackage)
      }
      return nextSelectedIds
    })
  }

  const activeGroupPackages = useMemo(
    () =>
      defaultGlyphPackages.filter(
        (glyphPackage) => glyphPackage.group === activeGroupId
      ),
    [activeGroupId]
  )

  return (
    <Grid
      templateColumns={{
        base: '132px minmax(0, 1fr)',
        md: '160px minmax(0, 1fr)',
      }}
      gap={4}
      h="100%"
      minH={0}
    >
      <GridItem
        borderRight="1px solid"
        borderColor="field.panelMuted"
        pr={3}
        minH={0}
      >
        <PackageGroupSidebar
          activeGroupId={activeGroupId}
          onSelectGroup={setActiveGroupId}
        />
      </GridItem>
      <GridItem minW={0} minH={0}>
        <Stack h="100%" minH={0} spacing={3}>
          <Box
            flex={1}
            minH={0}
            overflow="auto"
            display="flex"
            flexDirection="column"
          >
            <PackageCardsArea
              packages={activeGroupPackages}
              selectedPackageIds={selectedPackageIds}
              onTogglePackage={togglePackage}
            />
          </Box>
          <PackageGroupSource groupId={activeGroupId} />
        </Stack>
      </GridItem>
    </Grid>
  )
}
