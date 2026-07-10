/** @type {import("next").NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["dockerode"],
};

export default nextConfig;
