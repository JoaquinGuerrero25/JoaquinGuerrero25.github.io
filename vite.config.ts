import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Repo `JoaquinGuerrero25.github.io` → se sirve en la raíz. Si cambiás el nombre del repo, usá base '/nombre-repo/'.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: { target: 'es2020' },
});
