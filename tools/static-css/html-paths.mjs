import { parse } from 'parse5';

const PARSE_OPTIONS = { sourceCodeLocationInfo: true, scriptingEnabled: false };

function elementChildren(node) {
  return (node.childNodes ?? []).filter((child) => child.tagName !== undefined);
}

function findBody(document) {
  const html = elementChildren(document).find((node) => node.tagName === 'html');
  return elementChildren(html).find((node) => node.tagName === 'body');
}

function resolvePath(body, path) {
  return path.reduce((node, index) => (node ? elementChildren(node)[index] : undefined), body);
}

function collectImages(node, path, found) {
  elementChildren(node).forEach((child, index) => {
    const childPath = [...path, index];
    if (child.tagName === 'img') found.push({ node: child, key: childPath.join('.') });
    collectImages(child, childPath, found);
  });
  return found;
}

function isDeferrable(node) {
  const attributes = new Map(node.attrs.map((attribute) => [attribute.name, attribute.value]));
  return !attributes.has('loading') && !attributes.has('fetchpriority');
}

export function lazyLoadOffscreenImages(html, visiblePaths) {
  const visible = new Set(visiblePaths.map((path) => path.join('.')));
  const body = findBody(parse(html, PARSE_OPTIONS));
  const offsets = collectImages(body, [], [])
    .filter((image) => !visible.has(image.key) && isDeferrable(image.node))
    .map((image) => image.node.sourceCodeLocation.startTag.startOffset + '<img'.length)
    .sort((first, second) => second - first);
  return offsets.reduce((result, offset) => `${result.slice(0, offset)} loading="lazy"${result.slice(offset)}`, html);
}

export function locateElements(html, paths) {
  const body = findBody(parse(html, PARSE_OPTIONS));
  return paths.map((path) => resolvePath(body, path)).filter((node) => node?.sourceCodeLocation);
}

export function foldEndOffset(html, fold) {
  const leafEnds = locateElements(html, fold.leaves).map((node) => node.sourceCodeLocation.endOffset);
  const containerEnds = locateElements(html, fold.containers).map(
    (node) => node.sourceCodeLocation.startTag?.endOffset ?? node.sourceCodeLocation.endOffset
  );
  return Math.max(0, ...leafEnds, ...containerEnds);
}

function prioritizedStartTag(tag) {
  const withoutLazy = tag.replace(/\sloading="lazy"/, '').replace(/\sfetchpriority="[^"]*"/, '');
  return withoutLazy.replace(/^<img/, '<img fetchpriority="high"');
}

export function prioritizeImages(html, paths) {
  const tags = locateElements(html, paths)
    .map((node) => node.sourceCodeLocation.startTag)
    .sort((first, second) => second.startOffset - first.startOffset);
  return tags.reduce((result, tag) => {
    const original = result.slice(tag.startOffset, tag.endOffset);
    return result.slice(0, tag.startOffset) + prioritizedStartTag(original) + result.slice(tag.endOffset);
  }, html);
}
