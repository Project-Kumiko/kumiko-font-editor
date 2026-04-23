import { Button, Flex, Heading, Input, Text } from '@chakra-ui/react'
import type { RefObject } from 'react'

interface LocalImportCardProps {
  inputRef: RefObject<HTMLInputElement | null>
  isLoading: boolean
  onPackageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function LocalImportCard({
  inputRef,
  isLoading,
  onPackageUpload,
}: LocalImportCardProps) {
  return (
    <Flex
      border="1px dashed"
      borderColor="field.line"
      p={6}
      borderRadius="sm"
      bg="field.paper"
      direction="column"
      justifyContent="center"
    >
      <Heading size="sm" mb={2} textTransform="uppercase">
        本地匯入
      </Heading>
      <Text fontSize="sm" color="field.muted" mb={4}>
        請選擇包含各種字重 `.ufo` 的上層資料夾
      </Text>
      <Input type="file" onChange={onPackageUpload} display="none" />
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={onPackageUpload}
        style={{ display: 'none' }}
        id="package-upload"
      />
      <Button
        as="label"
        htmlFor="package-upload"
        cursor="pointer"
        isLoading={isLoading}
        loadingText="讀取與解析中..."
      >
        選擇 UFO 上層資料夾
      </Button>
      {isLoading && (
        <Text fontSize="xs" color="field.red.500" mt={3} fontFamily="mono">
          大型字庫在第一次匯入時需要一些時間，請稍候...
        </Text>
      )}
    </Flex>
  )
}
