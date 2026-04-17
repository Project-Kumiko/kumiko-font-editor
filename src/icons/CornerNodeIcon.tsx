import { Icon, type IconProps } from '@chakra-ui/react'

export function CornerNodeIcon(props: IconProps) {
  return (
    <Icon viewBox="0 0 24 24" boxSize={4} {...props}>
      <path
        d="M4 18 C8 18, 8 12, 12 12 L20 12"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="9.5" y="9.5" width="5" height="5" fill="currentColor" rx="0.6" />
    </Icon>
  )
}
