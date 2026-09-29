import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveServerEndpoint } from './src/network/serverAvailability.ts';
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    resolveServerEndpoint(
      process.env.VITE_SERVER_URL || env.VITE_SERVER_URL,
      true,
      '',
    );
  }
  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true },
  };
});
