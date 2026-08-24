/** @type {import("next").NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
  output: "standalone",
  allowedDevOrigins: ["[::1]", "localhost", "127.0.0.1"],
  serverExternalPackages: ["dockerode"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
