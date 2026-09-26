/** @type {import('next').NextConfig} */
const nextConfig = {
  // The site has no server-side code, so `next build` emits plain static files
  // (to out/) and it is served from Cloudflare Pages' CDN.
  output: 'export'
};
module.exports = nextConfig;
