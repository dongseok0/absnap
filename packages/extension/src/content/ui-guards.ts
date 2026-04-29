export function isAbsUiElement(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[id^="__abs_"]'))
}
