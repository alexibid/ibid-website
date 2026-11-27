function resolveTargetElement(target: EventTarget | null): Element | null {
  if (typeof Element !== 'undefined' && target instanceof Element) return target;
  if (typeof Node !== 'undefined' && target instanceof Node && target.parentElement) {
    return target.parentElement;
  }
  if (typeof document !== 'undefined') return document.activeElement;
  return null;
}

export function isEditableNavigationTarget(target: EventTarget | null): boolean {
  const element = resolveTargetElement(target);
  if (!element) return false;
  if (element.closest('input, textarea, select') !== null) return true;
  if (typeof HTMLElement !== 'undefined' && element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }
  const editableHost = element.closest('[contenteditable]');
  return editableHost !== null && editableHost.getAttribute('contenteditable')?.toLowerCase() !== 'false';
}

export function isButtonSpaceActivation(event: KeyboardEvent): boolean {
  if (event.key !== ' ') return false;
  const element = resolveTargetElement(event.target);
  return element !== null && element.closest('button, [role="button"], a[href], summary') !== null;
}

export function isScrollableTextAreaTarget(target: EventTarget | null): boolean {
  const element = resolveTargetElement(target);
  if (!element) return false;
  const textarea = element.closest('textarea');
  if (typeof HTMLTextAreaElement === 'undefined' || !(textarea instanceof HTMLTextAreaElement)) {
    return false;
  }
  return textarea.scrollHeight > textarea.clientHeight;
}
