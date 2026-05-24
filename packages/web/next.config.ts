import type { NextConfig } from 'next';

const config: NextConfig = {
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  images: { unoptimized: true },
};

export default config;
