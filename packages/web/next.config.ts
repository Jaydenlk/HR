import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  images: { unoptimized: true },
  // 生产容器化:输出自包含 standalone 产物(精简 node_modules + server.js),
  // 无需在 runner 镜像里再装依赖(见 Dockerfile.web)。
  output: 'standalone',
  // monorepo 下 trace 根需指向仓库根,否则 standalone 会漏拷 workspace 依赖。
  // 依据 Next 16 output.md:`outputFileTracingRoot: path.join(__dirname, '../../')`。
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default config;
