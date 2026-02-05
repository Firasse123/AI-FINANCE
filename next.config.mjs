/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
    ],
  },
  experimental:{
    serverActions:{
      bodySizeLimit:"5mb",
    }
  }
};

export default nextConfig;
