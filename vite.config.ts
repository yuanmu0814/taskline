import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // 抑制弃用警告
        silenceDeprecations: ['legacy-js-api', 'global-builtin', 'color-functions'],
      },
    },
  },
  server: {
    host: '0.0.0.0', // 监听所有网络接口
    port: 5173, // 默认端口，可以通过环境变量修改
    strictPort: false, // 如果端口被占用，尝试下一个可用端口
  },
})


