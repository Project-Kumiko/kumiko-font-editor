import { extendTheme, type ThemeConfig } from '@chakra-ui/react'
import type { StyleFunctionProps } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
}

const colors = {
  gray: {
    50: '#F2F2F7',
    100: '#E5E5EA',
    200: '#D1D1D6',
    300: '#C7C7CC',
    400: '#AEAEB2',
    500: '#8E8E93',
    600: '#636366',
    700: '#48484A',
    800: '#2C2C2E',
    900: '#1C1C1E',
  },

  blue: {
    50: '#E5F1FF',
    100: '#CCE4FF',
    200: '#99C9FF',
    300: '#66AFFF',
    400: '#3394FF',
    500: '#007AFF',
    600: '#0062CC',
    700: '#004999',
    800: '#003166',
    900: '#001833',
  },

  green: {
    50: '#EAF9EE',
    100: '#CBEED4',
    200: '#AEE4B8',
    300: '#90D89D',
    400: '#71CD81',
    500: '#34C759',
    600: '#2AA047',
    700: '#1F7A36',
    800: '#155324',
    900: '#0B2D13',
  },

  red: {
    50: '#FFEBEA',
    100: '#FFCDC9',
    200: '#FF9B94',
    300: '#FF695F',
    400: '#FF473D',
    500: '#FF3B30',
    600: '#CC2F26',
    700: '#99231D',
    800: '#661813',
    900: '#330C0A',
  },

  orange: {
    50: '#FFF4E5',
    100: '#FFE0B8',
    200: '#FFC270',
    300: '#FFA329',
    400: '#FF9A14',
    500: '#FF9500',
    600: '#CC7700',
    700: '#995900',
    800: '#663B00',
    900: '#331E00',
  },

  yellow: {
    50: '#FFFBE5',
    100: '#FFF3B8',
    200: '#FFE770',
    300: '#FFDB29',
    400: '#FFD414',
    500: '#FFCC00',
    600: '#CCA300',
    700: '#997A00',
    800: '#665200',
    900: '#332900',
  },

  purple: {
    50: '#F7EEFC',
    100: '#E8D2F7',
    200: '#D1A6EE',
    300: '#BA7AE6',
    400: '#A95DE1',
    500: '#AF52DE',
    600: '#8C42B2',
    700: '#693185',
    800: '#462159',
    900: '#23102C',
  },
}

const theme = extendTheme({
  config,
  colors,
  radii: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
    full: '9999px',
  },

  shadows: {
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    'glass-hover':
      '0 12px 40px 0 rgba(0, 0, 0, 0.12), 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },

  fonts: {
    heading: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
  },

  styles: {
    global: (props: StyleFunctionProps) => ({
      body: {
        bg:
          props.colorMode === 'dark' ? 'macos.canvasDark' : 'macos.canvasLight',
        color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'blackAlpha.900',
        WebkitFontSmoothing: 'antialiased',
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'lg',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      variants: {
        solid: (props: StyleFunctionProps) => ({
          bg: `${props.colorScheme}.500`,
          color: 'white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          _hover: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          _active: { transform: 'translateY(0)' },
        }),
        glass: (props: StyleFunctionProps) => ({
          bg: props.colorMode === 'dark' ? 'whiteAlpha.100' : 'white',
          border: '1px solid',
          borderColor:
            props.colorMode === 'dark' ? 'whiteAlpha.200' : 'blackAlpha.100',
          borderRadius: 'xl',
        }),
      },
      defaultProps: {
        colorScheme: 'blue',
      },
    },
    Card: {
      baseStyle: (props: StyleFunctionProps) => ({
        container: {
          bg: props.colorMode === 'dark' ? 'macos.cardDark' : 'macos.cardLight',
          borderRadius: '2xl',
          border: '1px solid',
          borderColor:
            props.colorMode === 'dark'
              ? 'macos.borderDark'
              : 'macos.borderLight',
          boxShadow: 'glass',
          padding: '6',
        },
      }),
    },
    Input: {
      parts: ['field'],
      baseStyle: {
        field: {
          borderRadius: 'full',
        },
      },
      variants: {
        macos: (props: StyleFunctionProps) => ({
          field: {
            bg: props.colorMode === 'dark' ? 'blackAlpha.300' : 'white',
            border: '1px solid',
            borderColor:
              props.colorMode === 'dark' ? 'whiteAlpha.100' : 'blackAlpha.100',
            _focus: {
              borderColor: 'macos.blue',
              boxShadow: `0 0 0 3px rgba(0, 122, 255, 0.4)`,
            },
          },
        }),
      },
      defaultProps: {
        variant: 'macos',
      },
    },

    Tabs: {
      variants: {
        'liquid-pills': (props: StyleFunctionProps) => ({
          tablist: {
            bg: props.colorMode === 'dark' ? 'whiteAlpha.50' : 'blackAlpha.50',
            borderRadius: 'xl',
            p: '1',
          },
          tab: {
            borderRadius: 'lg',
            fontWeight: '600',
            _selected: {
              bg: props.colorMode === 'dark' ? 'whiteAlpha.200' : 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              color: props.colorMode === 'dark' ? 'white' : 'macos.blue',
            },
          },
        }),
      },
      defaultProps: {
        variant: 'liquid-pills',
      },
    },
  },
})

export default theme
