import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react-pdf-ner-annotator',
      'react-pdf-ner-annotator/css/style.css',
    ],
  },
  build: {
    commonjsOptions: {
      include: [/react-pdf-ner-annotator/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
  server: {
    port: 5173,
  },
});
