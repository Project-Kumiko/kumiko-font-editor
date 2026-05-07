import {
  Button,
  Grid,
  GridItem,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Box,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@chakra-ui/react'
import { ArrowRight } from 'iconoir-react'
import { useCallback, useRef, useState } from 'react'
import { GlyphPackagePicker } from 'src/features/fontOverview/GlyphPackagePicker'

interface AddGlyphModalProps {
  existingGlyphIds: Set<string>
  inputValue: string
  isOpen: boolean
  onClose: () => void
  onInputChange: (value: string) => void
  onSubmit: () => void
}

export function AddGlyphModal({
  existingGlyphIds,
  inputValue,
  isOpen,
  onClose,
  onInputChange,
  onSubmit,
}: AddGlyphModalProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [selectedPackageGlyphNames, setSelectedPackageGlyphNames] = useState<
    string[]
  >([])

  const appendGlyphNames = useCallback(
    (glyphNames: string) => {
      onInputChange(inputValue ? `${inputValue}\n${glyphNames}` : glyphNames)
      inputRef.current?.focus()
    },
    [inputValue, onInputChange]
  )

  const handleAppendPackageGlyphNames = () => {
    appendGlyphNames(selectedPackageGlyphNames.join('\n'))
  }

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
      <ModalContent borderRadius="sm" h="100%">
        <ModalHeader>新增字符</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={5} h="100%">
          <Grid
            templateColumns="minmax(0, 1fr) 48px minmax(0, 1fr)"
            templateRows="1fr"
            gap={4}
            h="100%"
          >
            <GridItem minW={0} h="100%" overflow="auto">
              <Box maxH="100%" pr={1}>
                <GlyphPackagePicker
                  existingGlyphIds={existingGlyphIds}
                  onSelectedGlyphNamesChange={setSelectedPackageGlyphNames}
                />
              </Box>
            </GridItem>

            <GridItem
              display="flex"
              alignItems="center"
              justifyContent="center"
              h="100%"
            >
              <Tooltip label="加入右側輸入框">
                <IconButton
                  aria-label="加入右側輸入框"
                  icon={<ArrowRight />}
                  isDisabled={selectedPackageGlyphNames.length === 0}
                  onClick={handleAppendPackageGlyphNames}
                />
              </Tooltip>
            </GridItem>

            <GridItem minW={0} h="100%">
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
                      onSubmit()
                    }
                  }}
                />
                <Text fontSize="sm" color="field.muted">
                  glyph names 請用空白或換行分隔。Recipe 會先新增等號右側的目標
                  glyph。
                </Text>
                <Box display="flex" justifyContent="flex-end" gap={3}>
                  <Button variant="ghost" onClick={onClose}>
                    取消
                  </Button>
                  <Button onClick={onSubmit}>新增</Button>
                </Box>
              </Stack>
            </GridItem>
          </Grid>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
