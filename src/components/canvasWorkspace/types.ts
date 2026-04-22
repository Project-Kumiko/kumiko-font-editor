export type ToolId = 'pointer' | 'pen' | 'brush' | 'hand' | 'text'

export const AVAILABLE_TOOLS = [
  { id: 'pointer', label: 'Pointer', status: 'ready' },
  { id: 'pen', label: 'Pen', status: 'ready' },
  { id: 'brush', label: 'Brush', status: 'ready' },
  { id: 'text', label: 'Text', status: 'ready' },
  { id: 'hand', label: 'Hand', status: 'ready' },
] as const
