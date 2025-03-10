// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-02-25',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/image',
    '@vite-pwa/nuxt'
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
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'ParsonLabs Video',
      short_name: 'Video',
      description: 'Your own personal YouTube',
      theme_color: '#ffffff',
      icons: [
        {
          src: 'icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 20
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      type: 'module'
    }
  }
})