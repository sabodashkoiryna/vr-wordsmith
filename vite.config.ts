import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    // Vite 8 працює на Rolldown: об'єктний manualChunks прибрано,
    // натомість codeSplitting.groups.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // aws-amplify — найважчий пакет у дереві. Тримаємо окремо, щоб
            // лендінг (який його не імпортує) не тягнув цей чанк.
            { name: 'vendor-amplify', test: /node_modules[\\/](@aws-amplify|aws-amplify|@aws-sdk|@smithy)[\\/]/ },
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router)/ },
          ],
        },
      },
    },
  },
})
