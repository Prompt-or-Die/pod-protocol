import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  format: ["esm"],
  dts: false,
  splitting: false,
  treeshake: true,
  minify: process.env.NODE_ENV === "production",
  target: "node18",
  keepNames: true,
  bundle: true,
  external: [
    "@elizaos/core",
    "@pod-protocol/sdk",
    "@solana/web3.js",
    "bs58"
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
  esbuildOptions(options, context) {
    options.conditions = ["module", "import"];
    options.mainFields = ["module", "main"];
  },
  banner: {
    js: `/**
 * @elizaos/plugin-podcom
 * PoD Protocol ElizaOS Plugin
 * 
 * Blockchain-powered AI agent communication on Solana
 * 
 * @version 1.0.0
 * @license MIT
 * @author PoD Protocol Team
 */`,
  },
});