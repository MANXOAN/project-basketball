import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Cho các thiết bị trong cùng mạng LAN truy cập frontend của máy chủ.
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL || "http://127.0.0.1:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
