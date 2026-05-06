export type ToolId = 'pointer' | 'pen' | 'brush' | 'hand' | 'text'

export const AVAILABLE_TOOLS = [
  { id: 'pointer', label: 'Pointer', shortcut: 'V', status: 'ready' },
  { id: 'pen', label: 'Pen', shortcut: 'P', status: 'ready' },
  { id: 'brush', label: 'Brush', shortcut: 'B', status: 'ready' },
  { id: 'text', label: 'Text', shortcut: 'T', status: 'ready' },
  { id: 'hand', label: 'Hand', shortcut: 'H', status: 'ready' },
] as const
