import esbuild from "esbuild";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

console.log("Starting Atheon Codex SDK build...");
try {
  rmSync("dist", { recursive: true, force: true });
  console.log("✔ Cleaned dist/ directory.");
} catch (e) {}

// Shared config for both builds
const config = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  sourcemap: true,
  minify: true,
  packages: "external",
  platform: "node",
  target: "esnext",
};

async function build() {
  try {
    // Build ES Module (for import)
    await esbuild.build({
      ...config,
      format: "esm",
      outfile: "dist/index.mjs",
    });
    console.log("✔ ESM build complete (dist/index.mjs).");

    // Build CommonJS (for require)
    await esbuild.build({
      ...config,
      format: "cjs",
      outfile: "dist/index.cjs",
    });
    console.log("✔ CJS build complete (dist/index.cjs).");

    // Generate TypeScript declaration files (.d.ts)
    execSync(
      "npx tsc --emitDeclarationOnly --project tsconfig.json --outDir dist",
      {
        stdio: "inherit",
      },
    );
    console.log("✔ Type declarations generated (dist/index.d.ts).");

    console.log("\n✅ Build complete!");
  } catch (error) {
    console.error("\n❌ Build failed:", error);
    process.exit(1);
  }
}

build();
