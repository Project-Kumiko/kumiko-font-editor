import {
  Box,
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { LayoutGroup, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'
import {
  GlyphPackageSelectionSummary,
  GlyphPackagePicker,
  type GlyphPackageSelection,
} from 'src/features/fontOverview/GlyphPackagePicker'
import { getExistingGlyphLookupKeys } from 'src/features/fontOverview/glyphLookup'
import type { GlyphData } from 'src/store'

const emptyPackageSelection: GlyphPackageSelection = {
  glyphNames: [],
  existingCount: 0,
  missingGlyphNames: [],
  packages: [],
}

const tabHighlightTransition = {
  type: 'spring',
  stiffness: 520,
  damping: 38,
  mass: 0.8,
} as const

interface ModeTabProps {
  children: ReactNode
  isSelected: boolean
}

function ModeTab({ children, isSelected }: ModeTabProps) {
  return (
    <Tab
      position="relative"
      overflow="visible"
      bg="transparent"
      color={isSelected ? 'field.yellow.300' : 'field.ink'}
      _hover={{
        bg: 'transparent',
        color: isSelected ? 'field.yellow.300' : 'field.ink',
      }}
      _selected={{
        bg: 'transparent',
        color: 'field.yellow.300',
      }}
    >
      {isSelected && (
        <motion.span
          layoutId="add-glyph-modal-active-tab"
          transition={tabHighlightTransition}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 9999,
            background: 'var(--chakra-colors-field-ink)',
          }}
        />
      )}
      <Box as="span" position="relative" zIndex={1}>
        {children}
      </Box>
    </Tab>
  )
}

interface AddGlyphModalProps {
  glyphMap: Record<string, GlyphData>
  inputValue: string
  isOpen: boolean
  onClose: () => void
  onInputChange: (value: string) => void
  onSubmitManualInput: () => void
  onSubmitGlyphNames: (glyphNames: string[]) => void
}

export function AddGlyphModal({
  glyphMap,
  inputValue,
  isOpen,
  onClose,
  onInputChange,
  onSubmitManualInput,
  onSubmitGlyphNames,
}: AddGlyphModalProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [packageSelection, setPackageSelection] =
    useState<GlyphPackageSelection>(emptyPackageSelection)
  const existingGlyphIds = useMemo(
    () => getExistingGlyphLookupKeys(glyphMap),
    [glyphMap]
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      initialFocusRef={inputRef}
      size="6xl"
      isCentered
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent borderRadius="sm" h="800px">
        <ModalCloseButton zIndex={2} />
        <Tabs
          variant="enclosed"
          size="sm"
          display="flex"
          flex={1}
          flexDirection="column"
          minH={0}
          index={activeTabIndex}
          onChange={setActiveTabIndex}
        >
          <HStack
            align="center"
            justify="space-between"
            gap={4}
            px={6}
            pt={5}
            pb={3}
            pr={14}
          >
            <Text as="h2" fontSize="xl" fontWeight="900">
              新增字符
            </Text>
            <LayoutGroup id="add-glyph-modal-tabs">
              <TabList>
                <ModeTab isSelected={activeTabIndex === 0}>字集匯入</ModeTab>
                <ModeTab isSelected={activeTabIndex === 1}>手動輸入</ModeTab>
              </TabList>
            </LayoutGroup>
          </HStack>
          <ModalBody pb={5} flex={1} minH={0}>
            <TabPanels h="100%">
              <TabPanel p={0} h="100%" overflow="auto">
                <GlyphPackagePicker
                  existingGlyphIds={existingGlyphIds}
                  onSelectionChange={setPackageSelection}
                />
              </TabPanel>
              <TabPanel p={0} h="100%">
                <Stack h="100%" spacing={3}>
                  <Textarea
                    ref={inputRef}
                    placeholder={[
                      '輸入字符、glyph name、recipe 或範圍',
                      '例：字 uni8655 asmall-hira.vert A+ringcomb.lower=Aring uni4000:uni43FF',
                    ].join('\n')}
                    value={inputValue}
                    minH="480px"
                    flex={1}
                    resize="vertical"
                    fontFamily="mono"
                    onChange={(event) => onInputChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        event.preventDefault()
                        onSubmitManualInput()
                      }
                    }}
                  />
                  <Text fontSize="sm" color="field.muted">
                    glyph names 請用空白或換行分隔。Recipe
                    會先新增等號右側的目標 glyph。
                  </Text>
                </Stack>
              </TabPanel>
            </TabPanels>
          </ModalBody>
          <ModalFooter gap={3} alignItems="flex-end">
            <Box mr="auto" minW={0}>
              {activeTabIndex === 0 && (
                <GlyphPackageSelectionSummary selection={packageSelection} />
              )}
            </Box>
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (activeTabIndex === 0) {
                  onSubmitGlyphNames(packageSelection.missingGlyphNames)
                  return
                }

                onSubmitManualInput()
              }}
            >
              新增
            </Button>
          </ModalFooter>
        </Tabs>
      </ModalContent>
    </Modal>
  )
}
