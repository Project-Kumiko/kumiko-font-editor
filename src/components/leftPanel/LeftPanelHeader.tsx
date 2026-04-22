import { Box, Button, Heading, HStack, Text } from '@chakra-ui/react'

interface LeftPanelHeaderProps {
  hasSelectedGlyph: boolean
  isCjkGlyph: boolean
  onBack: () => void
}

export function LeftPanelHeader({
  hasSelectedGlyph,
  isCjkGlyph,
  onBack,
}: LeftPanelHeaderProps) {
  return (
    <>
      <HStack justify="space-between" align="flex-start">
        <Box>
          <Text
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="0.16em"
            color="gray.500"
            mb={1}
          >
            Kumiko Font Editor
          </Text>
          <Heading size="md" color="gray.800">
            {isCjkGlyph ? '部件檢索' : '相關字形'}
          </Heading>
        </Box>

        <Button size="sm" variant="ghost" onClick={onBack}>
          ⬅︎ 所有字符
        </Button>
      </HStack>

      {!hasSelectedGlyph ? (
        <Text fontSize="sm" color="gray.500">
          先選擇一個字符。
        </Text>
      ) : null}
    </>
  )
}
