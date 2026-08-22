/** @type {import('next').NextConfig} */
const nextConfig = {
   reactStrictMode: false,
   eslint: {
      // Dung eslint rieng cua project, khong chan build
      ignoreDuringBuilds: true,
   },
   typescript: {
      ignoreBuildErrors: false,
   },
   images: {
      // Tra ve URL string khi import anh (giong Vite) de giu nguyen code <img src={logo}>
      disableStaticImages: true,
   },
   webpack: (config) => {
      config.module.rules.push({
         test: /\.(png|jpe?g|gif|webp|avif|svg)$/i,
         type: 'asset/resource',
      });
      return config;
   },
};

export default nextConfig;
