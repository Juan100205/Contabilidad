/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Por defecto Next cachea la navegación entre páginas ~30s (Router Cache del
    // cliente), así que editar un dato y navegar a otra pantalla (o volver) podía
    // mostrar datos viejos hasta recargar toda la página. En 0, cada navegación
    // siempre trae datos frescos del servidor.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
