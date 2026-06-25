import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import zipPack from "@adjfut/vite-plugin-zip-pack";

export default defineConfig({
  plugins: [
    react(),
    zipPack({
      outDir: ".",
      outFileName: "dist.zip"
    })
  ]
});
