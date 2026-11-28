import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  buildRobots, buildSitemap, sitemapEntriesOf, sitemapUrlOf
} from '../../src/app/domain/utils/crawler-files.utils.ts';

async function readBuiltPages(browserDir) {
  const { routes } = JSON.parse(await readFile(join(dirname(browserDir), 'prerendered-routes.json'), 'utf8'));
  return Promise.all(
    Object.keys(routes).map(async (route) => ({ route, html: await readFile(join(browserDir, route, 'index.html'), 'utf8') }))
  );
}

async function main(browserDir) {
  const entries = sitemapEntriesOf(await readBuiltPages(browserDir));
  await writeFile(join(browserDir, 'sitemap.xml'), buildSitemap(entries));
  await writeFile(join(browserDir, 'robots.txt'), buildRobots(sitemapUrlOf(entries)));
}

await main(process.argv[2] ?? 'dist/ibid-website/browser');
