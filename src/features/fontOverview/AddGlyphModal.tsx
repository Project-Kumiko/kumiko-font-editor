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
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useMemo, useRef, useState } from 'react'
import { SlidingTabList } from 'src/features/common/SlidingTabList'
import {
  GlyphPackageSelectionSummary,
  GlyphPackagePicker,
  type GlyphPackageSelection,
} from 'src/features/fontOverview/GlyphPackagePicker'
import { getExistingGlyphLookupKeys } from 'src/features/fontOverview/glyphLookup'
import type { GlyphData } from 'src/store'
import { useTranslation } from 'react-i18next'

const emptyPackageSelection: GlyphPackageSelection = {
  glyphNames: [],
  existingCount: 0,
  missingGlyphNames: [],
  packages: [],
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
  const { t } = useTranslation()

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
              {t('fontOverview.addGlyph')}
            </Text>
            <SlidingTabList
              activeIndex={activeTabIndex}
              labels={['字集匯入', '手動輸入']}
              layoutGroupId="add-glyph-modal-tabs"
            />
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
                    {t('fontOverview.glyphInputHint')}
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
              {t('fontOverview.cancel')}
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
              {t('fontOverview.add')}
            </Button>
          </ModalFooter>
        </Tabs>
      </ModalContent>
    </Modal>
  )
}
