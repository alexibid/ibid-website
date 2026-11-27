import { fontFaceIsUsed, fontUsageOf } from './font-faces.mjs';
import { keyframeNamesIn } from './css-units.mjs';

export const SHARED_BUNDLE = 'layout';

const PAGE_BUNDLE_MARKERS = [
  { marker: '<website-home', bundle: 'home' },
  { marker: '<website-exit', bundle: 'exit' }
];

export function bundlesForPage(html) {
  const pageBundles = PAGE_BUNDLE_MARKERS.filter(({ marker }) => html.includes(marker)).map(({ bundle }) => bundle);
  return [SHARED_BUNDLE, ...pageBundles];
}

export function probeUnitsOf(units) {
  return units
    .filter((unit) => unit.kind === 'rule')
    .map(({ id, kind, selectors, conditions }) => ({ id, kind, selectors, conditions }));
}

function referencedKeyframes(units, ruleIds) {
  const names = new Set();
  units.filter((unit) => ruleIds.has(unit.id)).forEach((unit) => keyframeNamesIn(unit.text).forEach((name) => names.add(name)));
  return units.filter((unit) => unit.kind === 'keyframes' && names.has(unit.name)).map((unit) => unit.id);
}

function usedFontFaces(units, results) {
  const usage = fontUsageOf(results);
  return units.filter((unit) => unit.kind === 'font-face' && fontFaceIsUsed(unit.text, usage)).map((unit) => unit.id);
}

export function criticalIdsOf(units, results) {
  const ruleIds = new Set(results.flatMap((result) => result.critical));
  return new Set([...ruleIds, ...referencedKeyframes(units, ruleIds), ...usedFontFaces(units, results)]);
}

function largestImagePath(result) {
  const [largest] = [...result.images].sort((first, second) => second.area - first.area);
  return largest ? [largest.path] : [];
}

export function lcpImagePathsOf(results) {
  const unique = new Map(results.flatMap(largestImagePath).map((path) => [path.join('.'), path]));
  return Array.from(unique.values());
}

export function visibleImagePathsOf(results) {
  return results.flatMap((result) => result.images.map((image) => image.path));
}

export function foldOf(results) {
  return {
    leaves: results.flatMap((result) => result.leaves),
    containers: results.flatMap((result) => result.containers)
  };
}

export function inlinedEverywhereIds(pages, bundleName) {
  if (bundleName !== SHARED_BUNDLE || pages.length === 0) return new Set();
  const sets = pages.map((page) => page.criticalIds);
  return new Set([...sets[0]].filter((id) => sets.every((set) => set.has(id))));
}
