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
            //
            //
            // ВІДОМЕ: цей чанк прелоадиться з index.html, бо amplify-client
            // викликає Amplify.configure на рівні модуля, а AuthContext тягне
            // його завжди. Тобто 88 КБ gz завантажує кожен відвідувач
            // лендінга, включно з ~36 КБ storage, потрібними на одному екрані
            // за логіном. Ні окрема група, ні динамічний import() цього не
            // розчіпляють — storage дістається через сам пакет aws-amplify.
            // Розв'язує це лише лінива getClient() (етап 5 плану, не зроблено).
            { name: 'vendor-amplify', test: /node_modules[\\/](@aws-amplify|aws-amplify|@aws-sdk|@smithy)[\\/]/ },
            // Роздільник у кінці обов'язковий. Без нього `react` як префікс
            // ловить і `react-markdown` з усім деревом micromark/mdast — тобто
            // парсер лекцій переїжджає в чанк, який завантажує кожен
            // відвідувач лендінгу. Один раз це вже коштувало +116 КБ.
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
})
