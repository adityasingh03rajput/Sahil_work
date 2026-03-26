import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      include: '**/*.{jsx,tsx}',
    }),
    tailwindcss(),
    // Serve admin.html for /admin and /admin/* without changing the browser URL.
    // This keeps React Router's basename:'/admin' working correctly.
    {
      name: 'admin-html-fallback',
      configureServer(server) {
        return () => {
          server.middlewares.use(async (req, res, next) => {
            const rawUrl = (req.url ?? '').split('?')[0].split('#')[0];
            // Normalize: remove trailing slash for comparison (except root)
            const normalized = rawUrl.length > 1 ? rawUrl.replace(/\/$/, '') : rawUrl;
            const isAdminRoute =
              normalized === '/admin' ||
              normalized.startsWith('/admin/') ||
              rawUrl.startsWith('/admin/');

            // Don't intercept asset/file requests
            if (!isAdminRoute || rawUrl.includes('.')) return next();

            try {
              const adminHtmlPath = path.resolve(__dirname, 'admin.html');
              const raw = fs.readFileSync(adminHtmlPath, 'utf-8');
              // Run through Vite's HTML transform so HMR client is injected
              const html = await server.transformIndexHtml('/admin.html', raw);
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.statusCode = 200;
              res.end(html);
            } catch (e) {
              next(e);
            }
          });
        };
      },
    },
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],
  base: process.env.ELECTRON === 'true' ? './' : '/',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    modulePreload: { polyfill: true },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // strip all console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2,               // two compression passes — smaller bundle
      },
    },
    rollupOptions: {
      input: {
        main:  path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
      },
      output: {
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('pdfmake')) return 'vendor-pdf';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-socket';
          return 'vendor';
        },
      },
    },
  },

  server: {
    fs: { allow: ['.'] },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      'lucide-react',
      'sonner',
      'clsx',
      'tailwind-merge',
      'recharts',
      'lodash/get',
    ],
  },
})
