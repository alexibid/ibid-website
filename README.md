# ibid-website

ibid's public website. It reads like a book: a cover, chapters with numbered pages and an exit
page, with the content managed in PocketBase and edited from an admin area.

This app is a submodule of [ibid-workspace](https://github.com/alexibid/ibid-workspace), but it
does not use the workspace's shared build: it keeps its own `package.json`, `angular.json` and
dependencies.

## Stack

- Angular 21 with standalone components, signals, zoneless change detection and SSR (Express)
- PocketBase as the headless CMS, on its embedded SQLite
- Vitest through `@angular/build:unit-test`
- SCSS

Languages: Portuguese (default), English, Spanish and French.

## Structure

```
apps/ibid-website/
  src/app/
    core/        layouts (front office, admin), guards, interceptors, error handler and the
                 services: PocketBase, book, i18n, meta, navigation, routing, state, admin
    features/    cover, home, chapter, exit, not-found, and admin (login, list, create, read,
                 update, delete per language)
    shared/      components, constants, directives, pipes, types and utils
  src/environments/environment.template.ts   PocketBase URL and admin password placeholders
  pocketbase/    the PocketBase binary and its migrations (pb_migrations)
  public/        images, favicon and the fatal error page
```

`core` holds the singletons, `features` the pages, and `shared` the stateless pieces, so a page
can change or go without touching another.

## Content

PocketBase keeps its data outside the repository, in `~/.ibid-website/pb_data`. The schema lives
in `pocketbase/pb_migrations`.

Back up `pb_data` before changing the schema or the data — from the PocketBase admin
(Settings → Backups) or by copying the folder.

## Commands

Run inside `apps/ibid-website`.

| For                 | Command                          |
| :------------------ | :------------------------------- |
| Install             | `npm install`                    |
| PocketBase          | `npm run bd`                     |
| Serve               | `npm start`                      |
| Unit tests          | `npm test`                       |
| Production build    | `npm run build`                  |
| Serve the SSR build | `npm run serve:ssr:ibid-website` |

From the workspace root, Nx runs the same scripts: `npx nx build ibid-website`,
`npx nx test ibid-website`.
