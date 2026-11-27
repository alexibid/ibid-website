import postcss from 'postcss';

export const DESKTOP_MEDIA = '(min-width: 768px)';

const CONDITIONAL_AT_RULES = new Set(['media', 'supports', 'layer', 'container']);

function isConditional(node) {
  return node.type === 'atrule' && CONDITIONAL_AT_RULES.has(node.name);
}

function conditionsOf(node) {
  const conditions = [];
  for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    conditions.unshift({ name: parent.name, params: parent.params });
  }
  return conditions;
}

function describeUnit(node) {
  const conditions = conditionsOf(node);
  if (node.type === 'rule') return { kind: 'rule', selectors: node.selectors, conditions };
  if (node.name === 'font-face') return { kind: 'font-face', declarations: node.toString(), conditions };
  if (node.name.endsWith('keyframes')) return { kind: 'keyframes', name: node.params, conditions };
  return { kind: 'other', conditions };
}

function collectNodes(root) {
  const nodes = [];
  root.walk((node) => {
    if (node.type === 'rule' && node.parent.type !== 'atrule') nodes.push(node);
    if (node.type === 'rule' && isConditional(node.parent)) nodes.push(node);
    if (node.type === 'atrule' && !isConditional(node) && !isInsideKeyframes(node)) nodes.push(node);
  });
  return nodes;
}

function isInsideKeyframes(node) {
  return node.parent?.type === 'atrule' && node.parent.name.endsWith('keyframes');
}

const DESKTOP_TOKEN = DESKTOP_MEDIA.replace(/\s+/g, '');

function mediaParts(params) {
  return params.split(/\s+and\s+/);
}

function isDesktopPart(part) {
  return part.replace(/\s+/g, '') === DESKTOP_TOKEN;
}

export function isDesktopMedia(params) {
  return mediaParts(params).some(isDesktopPart) && !params.includes(',');
}

function isDesktopUnit(unit) {
  return unit.conditions.some((condition) => condition.name === 'media' && isDesktopMedia(condition.params));
}

export function parseBundle(name, css) {
  const root = postcss.parse(css);
  const units = collectNodes(root).map((node, index) => {
    const unit = describeUnit(node);
    return { ...unit, id: `${name}:${index}`, desktop: isDesktopUnit(unit), text: node.toString() };
  });
  return { name, css, units };
}

function removeEmptyWrappers(root) {
  root.walkAtRules((atRule) => {
    if (isConditional(atRule) && (atRule.nodes ?? []).length === 0) atRule.remove();
  });
  root.walkAtRules((atRule) => {
    if (isConditional(atRule) && (atRule.nodes ?? []).length === 0) atRule.remove();
  });
}

function unwrapDesktopMedia(root) {
  root.walkAtRules('media', (atRule) => {
    if (!isDesktopMedia(atRule.params)) return;
    const remaining = mediaParts(atRule.params).filter((part) => !isDesktopPart(part));
    if (remaining.length === 0) atRule.replaceWith(atRule.nodes);
    else atRule.params = remaining.join(' and ');
  });
}

function selectNodes(bundle, keepIds) {
  const root = postcss.parse(bundle.css);
  collectNodes(root).forEach((node, index) => {
    if (!keepIds.has(`${bundle.name}:${index}`)) node.remove();
  });
  removeEmptyWrappers(root);
  return root;
}

export function serializeUnits(bundle, keepIds) {
  return selectNodes(bundle, keepIds).toString().trim();
}

export function serializeDesktopUnits(bundle, keepIds) {
  const root = selectNodes(bundle, keepIds);
  unwrapDesktopMedia(root);
  return root.toString().trim();
}

export function keyframeNamesIn(text) {
  const names = new Set();
  for (const match of text.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)) {
    match[1].split(/[\s,]+/).forEach((token) => names.add(token));
  }
  return names;
}
