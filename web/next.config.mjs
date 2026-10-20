/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: { formats: ["image/avif", "image/webp"] },
};

if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DATA_SOURCE === "fixtures") {
  throw new Error("Fixture data is for development only and cannot be built for production.");
}

export default nextConfig;
