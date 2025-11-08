import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
            host: 'localhost',     // tell client to connect back to your host
        },
        watch: {
            usePolling: true,       // <== makes it detect file edits on Windows
            interval: 100           // check every 100ms
        },
    }
})
