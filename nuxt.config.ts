export default defineNuxtConfig({
  compatibilityDate: '2026-09-25',
  devtools: { enabled: false },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Engineering Evidence Explorer — Jarrod Savard',
      meta: [
        {
          name: 'description',
          content:
            'Follow the evidence. Explore a fictional engineering team through pull requests, transparent retrieval, and genuine recorded MCP investigations.',
        },
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: `${process.env.NUXT_APP_BASE_URL || '/'}favicon.svg`,
        },
      ],
    },
  },
  css: [
    '@fontsource/dm-sans/400.css',
    '@fontsource/dm-sans/500.css',
    '@fontsource/dm-sans/600.css',
    '@fontsource/dm-sans/700.css',
    '@fontsource/newsreader/400.css',
    '@fontsource/newsreader/400-italic.css',
    '~/assets/main.css',
  ],
  runtimeConfig: {
    public: {
      sourceUrl: process.env.NUXT_PUBLIC_SOURCE_URL || '',
      liveApiUrl: process.env.NUXT_PUBLIC_LIVE_API_URL || '',
    },
  },
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [
        '/',
        '/team',
        '/architecture',
        '/investigations/authentication',
        '/investigations/billing-jobs',
        '/investigations/disaster-recovery',
      ],
    },
  },
  typescript: { strict: true },
})
