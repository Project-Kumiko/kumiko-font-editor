import {
  CursorPointer,
  DragHandGesture,
  EditPencil,
  DesignNib,
  Text,
} from 'iconoir-react'
import type { ToolId } from './types'

type ToolIcon = typeof CursorPointer

export const TOOL_ICONS: Record<ToolId, ToolIcon> = {
  pointer: CursorPointer,
  pen: DesignNib,
  brush: EditPencil,
  text: Text,
  hand: DragHandGesture,
}
