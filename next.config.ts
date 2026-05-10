import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp', 'archiver', 'fs-extra', '@prisma/client'],
  turbopack: {},
};

export default nextConfig;
