/** @type {import('next').NextConfig} */
const nextConfig = (() => {
  const lanIp = process.env.HOST_LAN_IP;
  const port = process.env.PORT || '3000';
  const lanOrigin = lanIp ? `http://${lanIp}:${port}` : null;

  return {
    reactStrictMode: true,
    images: {
      domains: ['localhost'],
    },
    experimental: {
      // Silence dev cross-origin warnings when accessing via LAN on mobile
      ...(lanOrigin ? { allowedDevOrigins: [lanOrigin] } : {}),
    },
  };
})();

module.exports = nextConfig

