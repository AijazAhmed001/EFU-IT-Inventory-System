import path from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const port = Number(env.VITE_PORT || 5175)

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    build: {
      sourcemap: mode === "development",
    },
    server: {
      host: "0.0.0.0",
      port,
      strictPort: false,
    },
    preview: {
      host: "0.0.0.0",
      port,
    },
  }
})
