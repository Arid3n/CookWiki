/** ChatBar is 64pt tall; FAB bottom edge sits 96pt above its base, leaving a 32pt gap. */
export const FAB_BASE_OFFSET = 96;

/** With the keyboard open the ChatBar rides on it, so the keyboard height replaces the inset. */
export function fabBottomOffset(insetBottom: number, keyboardHeight: number): number {
  const kb = Number.isFinite(keyboardHeight) && keyboardHeight > 0 ? keyboardHeight : 0;
  return FAB_BASE_OFFSET + (kb > 0 ? kb : insetBottom);
}
