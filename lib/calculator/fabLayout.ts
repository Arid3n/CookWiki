/** Space under a dock (chat bar): it rests 8pt above the bottom safe-area inset. */
export const DOCK_BOTTOM_PADDING = 8;
/** The dock is 56pt tall and the 50pt button is centred on it: 3pt above the dock's bottom edge. */
export const FAB_DOCK_OFFSET = 3;
/** Gap between a dock and the calculator button beside it. */
export const FAB_GAP = 8;

/** Resting `bottom` of the calculator button: level with the chat bar on every screen, so it never moves. */
export function fabBottomOffset(insetBottom: number): number {
  return DOCK_BOTTOM_PADDING + FAB_DOCK_OFFSET + (Number.isFinite(insetBottom) && insetBottom > 0 ? insetBottom : 0);
}

/** Right padding a dock needs so the calculator button fits in the corner beside it. */
export function dockRightReserve(gutter: number, fabSize: number): number {
  return gutter + fabSize + FAB_GAP;
}
