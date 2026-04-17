import { Icon, type IconProps } from '@chakra-ui/react'

export function SmoothNodeIcon(props: IconProps) {
  return (
    <Icon viewBox="0 0 24 24" boxSize={4} {...props}>
      <path
        d="M4 16 C8 16, 8 8, 12 8 C16 8, 16 16, 20 16"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7" r="2.6" fill="currentColor" />
    </Icon>
  )
}
