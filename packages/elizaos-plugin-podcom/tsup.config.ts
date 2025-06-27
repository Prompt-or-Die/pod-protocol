import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  format: ["esm"],
  dts: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: [
    "@elizaos/core",
    "@pod-protocol/sdk",
    "@solana/web3.js"
  ],
});