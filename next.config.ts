import type { NextConfig } from "next";

// 'unsafe-inline' on script/style is the realistic floor for a Next.js app
// using inline style={{...}} (VerdictBadge, StatCard, etc.) without adding
// nonce-based CSP middleware — everything else here is fully locked down.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  // @moss-dev/moss ships a native N-API addon (.node binary) — keep it out of
  // the server bundle so Next.js loads it from node_modules at runtime instead
  // of trying to webpack/turbopack it.
  serverExternalPackages: ["@moss-dev/moss", "@moss-dev/moss-core", "@huggingface/transformers", "onnxruntime-node"],
  outputFileTracingIncludes: { '/api/*': [
    './models/**/*',
    './node_modules/onnxruntime-node/dist/**/*',
    './node_modules/onnxruntime-common/dist/**/*',
    './node_modules/onnxruntime-node/package.json',
    './node_modules/onnxruntime-node/node_modules/**/*',
    `./node_modules/onnxruntime-node/bin/napi-*/${process.platform}/${process.arch}/**/*`,
    `./node_modules/@img/sharp-${process.platform}-${process.arch}/**/*`,
    `./node_modules/@img/sharp-libvips-${process.platform}-${process.arch}/**/*`,
  ] },
  outputFileTracingExcludes: { '/api/*': [
    // CPU execution never needs CUDA/TensorRT or another platform's binaries.
    './node_modules/onnxruntime-node/bin/**/*providers_cuda*',
    './node_modules/onnxruntime-node/bin/**/*providers_tensorrt*',
    ...['darwin', 'linux', 'win32'].filter(platform => platform !== process.platform)
      .map(platform => `./node_modules/onnxruntime-node/bin/napi-*/${platform}/**/*`),
    ...['x64', 'arm64'].filter(arch => arch !== process.arch)
      .map(arch => `./node_modules/onnxruntime-node/bin/napi-*/${process.platform}/${arch}/**/*`),
  ] },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
