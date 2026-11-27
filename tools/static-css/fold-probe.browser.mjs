export function probeFold(units) {
  const INTERACTION = /:(hover|focus|focus-visible|focus-within|active)\b/;
  const PSEUDO_ELEMENT = /::?(before|after|placeholder|marker|selection|backdrop|first-letter|first-line|-webkit-[\w-]+|-moz-[\w-]+)(\([^)]*\))?/g;
  const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };

  const intersect = (a, b) => ({
    left: Math.max(a.left, b.left), top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom)
  });
  const hasArea = (rect) => rect.right > rect.left && rect.bottom > rect.top;
  const clips = (element) => {
    const style = getComputedStyle(element);
    return style.overflowX !== 'visible' || style.overflowY !== 'visible';
  };

  const visibleRect = (element) => {
    let rect = intersect(element.getBoundingClientRect(), viewport);
    for (let parent = element.parentElement; parent && hasArea(rect); parent = parent.parentElement) {
      if (clips(parent)) rect = intersect(rect, parent.getBoundingClientRect());
    }
    return rect;
  };

  const isPainted = (element) => {
    const style = getComputedStyle(element);
    return style.visibility !== 'hidden' && hasArea(visibleRect(element));
  };

  const elements = Array.from(document.querySelectorAll('body *'));
  const painted = elements.filter(isPainted);
  const candidates = new Set([document.documentElement, document.body]);
  painted.forEach((element) => {
    for (let node = element; node; node = node.parentElement) candidates.add(node);
  });
  const anchors = new Set(candidates);
  elements.forEach((element) => {
    if (anchors.has(element.parentElement)) candidates.add(element);
  });

  const matchesCandidate = (selector) => {
    if (INTERACTION.test(selector)) return false;
    const stripped = selector.replace(PSEUDO_ELEMENT, '').trim() || '*';
    try {
      return Array.from(document.querySelectorAll(stripped)).some((element) => candidates.has(element));
    } catch {
      return true;
    }
  };

  const conditionHolds = (condition) => {
    if (condition.name === 'media') return matchMedia(condition.params).matches;
    if (condition.name === 'supports') return CSS.supports(condition.params);
    return true;
  };

  const critical = units
    .filter((unit) => unit.kind === 'rule' && unit.conditions.every(conditionHolds))
    .filter((unit) => unit.selectors.some(matchesCandidate))
    .map((unit) => unit.id);

  const families = new Set();
  let text = '';
  painted.forEach((element) => {
    getComputedStyle(element).fontFamily.split(',').forEach((family) => families.add(family.trim().replace(/['"]/g, '')));
    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    });
  });

  const pathOf = (element) => {
    const path = [];
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      path.unshift(Array.prototype.indexOf.call(node.parentElement.children, node));
    }
    return path;
  };
  const paintedSet = new Set(painted);
  const leaves = painted.filter((element) => !Array.from(element.children).some((child) => paintedSet.has(child)));
  const images = painted
    .filter((element) => element instanceof HTMLImageElement)
    .map((image) => {
      const rect = visibleRect(image);
      return { path: pathOf(image), area: (rect.right - rect.left) * (rect.bottom - rect.top) };
    });

  return {
    critical,
    families: Array.from(families),
    text,
    containers: painted.map(pathOf),
    leaves: leaves.map(pathOf),
    images
  };
}
