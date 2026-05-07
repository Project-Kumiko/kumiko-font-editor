import {
  Badge,
  Box,
  Button,
  Link,
  HStack,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
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

interface GlyphPackagePickerProps {
  existingGlyphIds: Set<string>
  onSelectedGlyphNamesChange: (glyphNames: string[]) => void
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
              已選
            </Badge>
          )}
        </Stack>
        <Text fontSize="xs" color={mutedColor} fontWeight="normal">
          {glyphPackage.description}
        </Text>
        <Text fontSize="xs" color={mutedColor} fontFamily="mono">
          {glyphPackage.glyphNames.length.toLocaleString()} glyphs
        </Text>
      </Stack>
    </Button>
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
  if (packages.length === 0) {
    return (
      <Text fontSize="sm" color="field.muted">
        尚未選取
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

export function GlyphPackagePicker({
  existingGlyphIds,
  onSelectedGlyphNamesChange,
}: GlyphPackagePickerProps) {
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(
    () => new Set(['zh-basic'])
  )
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
    onSelectedGlyphNamesChange(missingGlyphNames)
  }, [missingGlyphNames, onSelectedGlyphNamesChange])

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

  return (
    <Stack spacing={3}>
      <Box>
        <SummaryFormula packages={selectedPackages} />
        <Text fontSize="xs" color="field.muted" mt={2}>
          合計 {selectedGlyphNames.size.toLocaleString()} glyphs，已存在{' '}
          {selectedGlyphNames.size - missingGlyphNames.length}，預計新增{' '}
          {missingGlyphNames.length.toLocaleString()}
        </Text>
      </Box>

      <Tabs variant="enclosed" size="sm">
        <TabList flexWrap="wrap" gap={2}>
          {packageGroups.map((group) => (
            <Tab key={group.id}>{group.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {packageGroups.map((group) => {
            const groupPackages = defaultGlyphPackages.filter(
              (glyphPackage) => glyphPackage.group === group.id
            )

            return (
              <TabPanel
                key={group.id}
                px={0}
                pb={0}
                maxH="100%"
                overflow="auto"
              >
                <Stack spacing={3}>
                  {group.id === 'zh-jf7000' && (
                    <Text fontSize="xs" color="field.muted">
                      來源：
                      <Link
                        href="https://justfont.com/jf7000"
                        isExternal
                        fontWeight="900"
                        color="field.ink"
                        textDecoration="underline"
                      >
                        jf7000 當務字集
                      </Link>
                    </Text>
                  )}
                  {getPackagesBySection(groupPackages).map(
                    ([section, sectionPackages]) => (
                      <Stack key={section} spacing={2}>
                        <Text
                          fontSize="xs"
                          color="field.muted"
                          fontFamily="mono"
                          fontWeight="900"
                        >
                          {section}
                        </Text>
                        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={2}>
                          {sectionPackages.map((glyphPackage) => (
                            <PackageCard
                              key={glyphPackage.id}
                              glyphPackage={glyphPackage}
                              isSelected={selectedPackageIds.has(
                                glyphPackage.id
                              )}
                              onToggle={() => togglePackage(glyphPackage)}
                            />
                          ))}
                        </SimpleGrid>
                      </Stack>
                    )
                  )}
                </Stack>
              </TabPanel>
            )
          })}
        </TabPanels>
      </Tabs>
    </Stack>
  )
}
