import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

const colors = {
  endfield: {
    yellow: {
      400: '#FDE047',
      500: '#FBE335', // 核心主色
      600: '#EAB308',
    },
    bg: {
      base: '#F3F4F6',
      surface: '#FFFFFF',
    },
    border: '#111827',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      inverted: '#FFFFFF',
    },
  },
}

const components = {
  Button: {
    baseStyle: {
      borderRadius: '0px', // 回歸完全直角，更硬核
      textTransform: 'uppercase',
      fontWeight: 'bold',
    },
    variants: {
      // 主按鈕：黃底黑字
      solid: {
        bg: 'endfield.yellow.500',
        color: 'black',
        _hover: {
          bg: 'black',
          color: 'endfield.yellow.500', // Hover時反轉為黑底黃字
          transform: 'translateY(-1px)',
        },
        _active: {
          bg: 'black',
          color: 'white',
        },
      },
      outline: {
        border: '1px solid',
        borderColor: 'endfield.border',
        color: 'endfield.border',
        _hover: {
          bg: 'black',
          color: 'white',
        },
      },
    },
    defaultProps: {
      variant: 'solid',
    },
  },

  // 針對列表項目的樣式定義（可用於 List 或自定義組件）
  List: {
    parts: ['item'],
    baseStyle: {
      item: {
        px: 4,
        py: 2,
        transition: 'all 0.2s',
        cursor: 'pointer',
        fontWeight: 'medium',
        // Hover：黑色背景
        _hover: {
          bg: 'black',
          color: 'white',
        },
        // Selected：黃色背景（使用 data-selected 或 aria-selected 觸發）
        _selected: {
          bg: 'endfield.yellow.500',
          color: 'black',
          fontWeight: 'bold',
        },
        // 如果是使用 Chakra 的連結或按鈕列表
        _active: {
          bg: 'endfield.yellow.500',
          color: 'black',
        },
      },
    },
  },

  // 針對 Menu 組件的直接覆寫
  Menu: {
    baseStyle: {
      list: {
        borderRadius: '0px',
        border: '1px solid',
        borderColor: 'endfield.border',
        bg: 'white',
        p: 0,
      },
      item: {
        py: 3,
        fontWeight: 'bold',
        // 預設狀態
        _hover: {
          bg: 'black',
          color: 'endfield.yellow.500', // 科技感極強的黑底黃字
        },
        _focus: {
          bg: 'black',
          color: 'endfield.yellow.500',
        },
        _active: {
          bg: 'endfield.yellow.500',
          color: 'black',
        },
        _expanded: {
          bg: 'endfield.bg.base',
        },
      },
    },
  },

  Tabs: {
    variants: {
      enclosed: {
        tab: {
          borderRadius: '0px',
          fontWeight: 'bold',
          _selected: {
            color: 'black',
            bg: 'endfield.yellow.500',
            borderColor: 'endfield.border',
          },
        },
      },
    },
  },
}

const theme = extendTheme({
  config,
  colors,
  components,
  styles: {
    global: {
      body: {
        bg: 'endfield.bg',
        color: 'endfield.text.main',
        // 加上極其微弱的網格背景，提升「藍圖」感
        backgroundImage: 'radial-gradient(#000000 1px, transparent 0)',
        backgroundSize: '20px 20px',
        backgroundPosition: '-19px -19px',
      },
    },
  },
})

export default theme
