import {
  extendTheme,
  type StyleFunctionProps,
  type ThemeConfig,
} from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
}

const colors = {
  gray: {
    50: '#fbfbfd',
    100: '#f4f5f8',
    200: '#e8e9ee',
    300: '#d7d9e0',
    400: '#b7bcc7',
    500: '#9097a5',
    600: '#6c7381',
    700: '#4f5562',
    800: '#343842',
    900: '#1f2128',
  },
  blue: {
    50: '#eef5ff',
    100: '#d9e9ff',
    200: '#b6d4ff',
    300: '#86b7ff',
    400: '#5193ff',
    500: '#0a84ff',
    600: '#0066d6',
    700: '#004ca8',
    800: '#003577',
    900: '#001c42',
  },
  teal: {
    50: '#ecfbf7',
    100: '#cef3e7',
    200: '#a6e7d5',
    300: '#78d9c0',
    400: '#43c7a8',
    500: '#24b08f',
    600: '#198a70',
    700: '#116654',
    800: '#0a4339',
    900: '#04221f',
  },
  green: {
    50: '#eefbf1',
    100: '#d5f4dc',
    200: '#afe8bc',
    300: '#7dd899',
    400: '#4bc676',
    500: '#30b45d',
    600: '#208e47',
    700: '#166734',
    800: '#0c4221',
    900: '#04210f',
  },
  orange: {
    50: '#fff6ec',
    100: '#ffe5c8',
    200: '#ffd09a',
    300: '#ffb769',
    400: '#ff9e37',
    500: '#ff8a1f',
    600: '#d96c08',
    700: '#a95205',
    800: '#753903',
    900: '#3d1d01',
  },
  red: {
    50: '#fff0f0',
    100: '#ffd9d7',
    200: '#ffb2ad',
    300: '#ff857d',
    400: '#ff5f55',
    500: '#ff453a',
    600: '#d9342b',
    700: '#aa251f',
    800: '#741713',
    900: '#3d0907',
  },
  cyan: {
    50: '#ecfbff',
    100: '#cff4ff',
    200: '#9eeaff',
    300: '#64dcff',
    400: '#27c9ff',
    500: '#00b5f0',
    600: '#008fc2',
    700: '#006a92',
    800: '#004864',
    900: '#002535',
  },
  macos: {
    blue: '#0a84ff',
    canvasLight: '#eef1f6',
    canvasDark: '#17181c',
    panelLight: 'rgba(255, 255, 255, 0.78)',
    panelDark: 'rgba(34, 36, 43, 0.78)',
    cardLight: 'rgba(255, 255, 255, 0.88)',
    cardDark: 'rgba(38, 40, 48, 0.88)',
    borderLight: 'rgba(15, 23, 42, 0.08)',
    borderDark: 'rgba(255, 255, 255, 0.10)',
    fieldLight: 'rgba(255, 255, 255, 0.72)',
    fieldDark: 'rgba(18, 20, 26, 0.72)',
    hoverLight: 'rgba(255, 255, 255, 0.96)',
    hoverDark: 'rgba(60, 64, 76, 0.92)',
    activeLight: 'rgba(11, 132, 255, 0.16)',
    activeDark: 'rgba(10, 132, 255, 0.28)',
  },
}

const focusRing = '0 0 0 3px rgba(10, 132, 255, 0.22)'

const theme = extendTheme({
  config,
  colors,
  radii: {
    none: '0',
    sm: '0.375rem',
    base: '0.625rem',
    md: '0.875rem',
    lg: '1rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    full: '9999px',
  },
  fonts: {
    heading:
      '"SF Pro Display", "IBM Plex Sans", "Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif',
    body: '"SF Pro Text", "IBM Plex Sans", "Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  shadows: {
    outline: focusRing,
    glass:
      '0 18px 44px rgba(15, 23, 42, 0.10), 0 2px 10px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.62)',
    'glass-hover':
      '0 24px 54px rgba(15, 23, 42, 0.14), 0 6px 18px rgba(15, 23, 42, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
    inset:
      'inset 0 1px 0 rgba(255, 255, 255, 0.78), inset 0 -1px 0 rgba(15, 23, 42, 0.04)',
  },
  styles: {
    global: (props: StyleFunctionProps) => ({
      'html, body': {
        minHeight: '100%',
      },
      body: {
        bg:
          props.colorMode === 'dark' ? 'macos.canvasDark' : 'macos.canvasLight',
        color:
          props.colorMode === 'dark' ? 'rgba(255,255,255,0.92)' : 'gray.800',
        backgroundImage:
          props.colorMode === 'dark'
            ? 'radial-gradient(circle at top, rgba(10, 132, 255, 0.16), transparent 34%), linear-gradient(180deg, #20222a 0%, #17181c 100%)'
            : 'radial-gradient(circle at top, rgba(10, 132, 255, 0.12), transparent 34%), linear-gradient(180deg, #f8f9fc 0%, #eef1f6 100%)',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      '*::selection': {
        background: 'rgba(10, 132, 255, 0.22)',
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'full',
        fontWeight: '600',
        letterSpacing: '-0.01em',
        transition:
          'background-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease, border-color 0.16s ease',
        _focusVisible: {
          boxShadow: focusRing,
        },
      },
      sizes: {
        sm: {
          px: 3,
          h: 8,
          fontSize: 'sm',
        },
        md: {
          px: 4,
          h: 10,
          fontSize: 'sm',
        },
      },
      variants: {
        solid: (props: StyleFunctionProps) => ({
          bg: `${props.colorScheme}.500`,
          color: 'white',
          _hover: {
            bg: `${props.colorScheme}.400`,
          },
          _active: {
            bg: `${props.colorScheme}.600`,
            transform: 'translateY(0)',
            boxShadow:
              props.colorMode === 'dark'
                ? '0 4px 10px rgba(10, 132, 255, 0.18)'
                : '0 4px 10px rgba(10, 132, 255, 0.14)',
          },
        }),
        ghost: (props: StyleFunctionProps) => ({
          color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.700',
          bg: 'transparent',
          _hover: {
            bg: props.colorMode === 'dark' ? 'whiteAlpha.120' : 'blackAlpha.50',
          },
          _active: {
            bg:
              props.colorMode === 'dark' ? 'whiteAlpha.180' : 'blackAlpha.100',
          },
        }),
        outline: (props: StyleFunctionProps) => ({
          color:
            props.colorMode === 'dark'
              ? `${props.colorScheme}.100`
              : `${props.colorScheme}.700`,
          bg:
            props.colorMode === 'dark'
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(255,255,255,0.5)',
          border: '1px solid',
          borderColor:
            props.colorMode === 'dark'
              ? 'whiteAlpha.200'
              : 'rgba(15, 23, 42, 0.10)',
          boxShadow: 'inset',
          _hover: {
            bg:
              props.colorMode === 'dark'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.85)',
            borderColor: `${props.colorScheme}.300`,
          },
          _active: {
            bg:
              props.colorMode === 'dark'
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(15, 23, 42, 0.06)',
          },
        }),
        glass: (props: StyleFunctionProps) => ({
          bg:
            props.colorMode === 'dark' ? 'macos.panelDark' : 'macos.panelLight',
          color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.700',
          border: '1px solid',
          borderColor:
            props.colorMode === 'dark'
              ? 'macos.borderDark'
              : 'macos.borderLight',
          boxShadow: 'glass',
          backdropFilter: 'blur(24px) saturate(180%)',
          _hover: {
            bg:
              props.colorMode === 'dark'
                ? 'macos.hoverDark'
                : 'macos.hoverLight',
            boxShadow: 'glass-hover',
            transform: 'translateY(-1px)',
          },
          _active: {
            transform: 'translateY(0)',
          },
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
          backdropFilter: 'blur(28px) saturate(180%)',
          padding: 6,
        },
      }),
    },
    Input: {
      parts: ['field'],
      baseStyle: {
        field: {
          borderRadius: 'xl',
          fontSize: 'sm',
          _placeholder: {
            color: 'gray.500',
          },
        },
      },
      variants: {
        macos: (props: StyleFunctionProps) => ({
          field: {
            bg:
              props.colorMode === 'dark'
                ? 'macos.fieldDark'
                : 'macos.fieldLight',
            border: '1px solid',
            borderColor:
              props.colorMode === 'dark'
                ? 'macos.borderDark'
                : 'macos.borderLight',
            boxShadow: 'inset',
            backdropFilter: 'blur(20px) saturate(170%)',
            _hover: {
              borderColor:
                props.colorMode === 'dark'
                  ? 'whiteAlpha.300'
                  : 'rgba(15, 23, 42, 0.14)',
            },
            _focusVisible: {
              borderColor: 'blue.400',
              boxShadow: focusRing,
              bg:
                props.colorMode === 'dark'
                  ? 'rgba(18, 20, 26, 0.9)'
                  : 'rgba(255,255,255,0.95)',
            },
          },
        }),
      },
      defaultProps: {
        variant: 'macos',
      },
    },
    Select: {
      parts: ['field', 'icon'],
      baseStyle: {
        field: {
          borderRadius: 'xl',
          fontSize: 'sm',
        },
        icon: {
          color: 'gray.500',
        },
      },
      variants: {
        macos: (props: StyleFunctionProps) => ({
          field: {
            bg:
              props.colorMode === 'dark'
                ? 'macos.fieldDark'
                : 'macos.fieldLight',
            border: '1px solid',
            borderColor:
              props.colorMode === 'dark'
                ? 'macos.borderDark'
                : 'macos.borderLight',
            boxShadow: 'inset',
            backdropFilter: 'blur(20px) saturate(170%)',
            _focusVisible: {
              borderColor: 'blue.400',
              boxShadow: focusRing,
            },
          },
        }),
      },
      defaultProps: {
        variant: 'macos',
      },
    },
    Tag: {
      baseStyle: {
        container: {
          borderRadius: 'full',
          fontWeight: '600',
        },
      },
      variants: {
        subtle: (props: StyleFunctionProps) => ({
          container: {
            bg:
              props.colorMode === 'dark'
                ? `${props.colorScheme}.900`
                : `${props.colorScheme}.50`,
            color:
              props.colorMode === 'dark'
                ? `${props.colorScheme}.100`
                : `${props.colorScheme}.700`,
            border: '1px solid',
            borderColor:
              props.colorMode === 'dark'
                ? 'whiteAlpha.100'
                : `${props.colorScheme}.100`,
          },
        }),
      },
    },
    Tabs: {
      variants: {
        'liquid-pills': (props: StyleFunctionProps) => ({
          tablist: {
            bg:
              props.colorMode === 'dark'
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.58)',
            borderRadius: 'full',
            border: '1px solid',
            borderColor:
              props.colorMode === 'dark'
                ? 'macos.borderDark'
                : 'macos.borderLight',
            boxShadow: 'inset',
            p: 1,
            backdropFilter: 'blur(20px) saturate(180%)',
          },
          tab: {
            borderRadius: 'full',
            fontWeight: '600',
            color: props.colorMode === 'dark' ? 'whiteAlpha.800' : 'gray.600',
            _selected: {
              bg:
                props.colorMode === 'dark'
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.94)',
              boxShadow:
                props.colorMode === 'dark'
                  ? '0 8px 18px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.12)'
                  : '0 8px 18px rgba(15, 23, 42, 0.10), inset 0 1px 0 rgba(255,255,255,0.85)',
              color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'blue.600',
            },
          },
          tabpanel: {
            px: 0,
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
