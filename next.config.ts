import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
  poweredByHeader: false,
  webpack(config,{isServer}) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.output.environment={...config.output.environment,asyncFunction:true};
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    if(!isServer)config.resolve.alias = {...config.resolve.alias,'isomorphic-ws':path.resolve('src/lib/midnight/browser-websocket.ts'),'cross-fetch':path.resolve('src/lib/midnight/browser-fetch.ts')};
    return config;
  }
};
export default config;
