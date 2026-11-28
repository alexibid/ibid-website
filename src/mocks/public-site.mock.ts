export const PUBLIC_SITE_FIXTURES = {
  coverRoute: '/pt',
  chapter: {
    route: '/pt/mock-capitulo',
    title: 'Capítulo de teste',
    section: 'Secção de teste',
    subsection: 'Subsecção de teste'
  },
  contactRoutes: {
    pt: '/pt/mock-contactos',
    en: '/en/mock-contacts'
  },
  missingRoute: '/pt/non-existent-route-404'
} as const;

export type PublicSiteLanguage = keyof typeof PUBLIC_SITE_FIXTURES.contactRoutes;
