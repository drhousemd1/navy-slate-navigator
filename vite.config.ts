import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createHash } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';

function offlineShell(): Plugin {
  let root = '';
  let output = '';
  return {
    name: 'obedience-offline-shell', apply: 'build',
    configResolved(config) { root = config.root; output = path.resolve(root, config.build.outDir); },
    async writeBundle(_options, bundle) {
      const files = Object.keys(bundle).filter(file => file === 'index.html' || /\.(?:js|css|woff2?|ttf|png|svg|jpe?g|webp|gif|ico)$/.test(file)).sort();
      for (const file of ['manifest.json', 'icons/icon-192.png', 'icons/icon-512.png']) {
        try { await access(path.join(output, file)); files.push(file); } catch { /* Optional static icons. */ }
      }
      const hash = createHash('sha256');
      for (const file of files) { hash.update(file); hash.update(await readFile(path.join(output, file))); }
      const template = await readFile(path.join(root, 'public/sw.js'), 'utf8');
      hash.update(template);
      const manifest = { version: hash.digest('hex').slice(0, 20), assets: files.map(file => `/${file}`) };
      await writeFile(path.join(output, 'sw.js'), template.replace(
        "/* OBEDIENCE_SHELL_MANIFEST */ { version: 'unbuilt', assets: [] }", JSON.stringify(manifest)));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    offlineShell(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
