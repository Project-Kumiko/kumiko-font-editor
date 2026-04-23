import {
  Box,
  Button,
  Collapse,
  Heading,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'

interface GitHubImportCardProps {
  isLoading: boolean
  refInput: string
  repoInput: string
  showRefInput: boolean
  onImport: () => void
  onRefInputChange: (value: string) => void
  onRepoInputChange: (value: string) => void
  onToggleRefInput: () => void
}

export function GitHubImportCard({
  isLoading,
  refInput,
  repoInput,
  showRefInput,
  onImport,
  onRefInputChange,
  onRepoInputChange,
  onToggleRefInput,
}: GitHubImportCardProps) {
  return (
    <Box
      border="1px solid"
      borderColor="field.line"
      p={6}
      borderRadius="sm"
      bg="field.panel"
    >
      <Heading size="sm" mb={2} textTransform="uppercase">
        從 GitHub 載入
      </Heading>
      <Text fontSize="sm" color="field.muted" mb={4}>
        輸入 `owner/repo` 或 GitHub URL。
      </Text>
      <VStack spacing={3} align="stretch">
        <Input
          value={repoInput}
          onChange={(event) => onRepoInputChange(event.target.value)}
          placeholder="owner/repo"
        />
        <Button
          size="sm"
          variant="ghost"
          alignSelf="flex-start"
          onClick={onToggleRefInput}
          rightIcon={
            <Text
              as="span"
              fontSize="sm"
              transform={showRefInput ? 'rotate(180deg)' : 'rotate(0deg)'}
              transition="transform 0.2s ease"
            >
              ▾
            </Text>
          }
        >
          {showRefInput
            ? '收合 branch / tag / commit'
            : '指定 branch / tag / commit'}
        </Button>
        <Collapse in={showRefInput} animateOpacity>
          <Box>
            <Input
              value={refInput}
              onChange={(event) => onRefInputChange(event.target.value)}
              placeholder="branch、tag 或 commit（可留空）"
            />
          </Box>
        </Collapse>
        <Button
          onClick={() => void onImport()}
          isLoading={isLoading}
          loadingText="下載與解析中..."
        >
          載入 GitHub 專案
        </Button>
      </VStack>
    </Box>
  )
}
