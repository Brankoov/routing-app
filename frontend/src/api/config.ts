/// <reference types="vite/client" />
// Om VITE_API_URL finns (på Vercel), använd den. Annars använd localhost (på din dator).
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';