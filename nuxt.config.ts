// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-02-25',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/image',
  ],
  colorMode: {
    classSuffix: "",
  },
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui'
  },
  app: {
    layoutTransition: {
      name: "layout",
      mode: "out-in"
    }
  },
  routeRules: {
    '/': { prerender: true },
    '/settings': { prerender: true },
    
    '/watch': { swr: 300 },
    '/channel/**': { swr: 600 },
    '/playlist/**': { swr: 600 },
    '/search': { swr: 60 }
  },
  image: {
    providers: {
      ipx: {
        provider: 'ipx',
      },
    },
    presets: {
      thumbnail: {
        modifiers: {
          format: 'webp',
          width: 320,
          height: 180,
          quality: 80,
        }
      }
    }
  },
  dir: {
    pages: 'pages'
  },
  nitro: {
    routeRules: {
      '/api/**': { cors: true }
    }
  }
})