/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    FARCASTER_APP_URL: process.env.FARCASTER_APP_URL,
  },
}

module.exports = nextConfig

