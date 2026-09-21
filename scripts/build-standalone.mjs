import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = resolve(root, "app/globals.css");
const outputPath = resolve(root, "public/AI_Relighting_Prompt_Generator.html");

const result = await build({
  entryPoints: [resolve(root, "standalone/app.ts")],
  outfile: "relight-standalone.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  write: false,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
});

const javascript = result.outputFiles.find((file) => file.path.endsWith(".js"))?.text;
if (!javascript) throw new Error("Standalone JavaScript bundle was not generated");

const css = (await readFile(cssPath, "utf8"))
  .replace(/^@import\s+["']tailwindcss["'];?\s*/m, "")
  .replace(/<\/style/gi, "<\\/style");
const bundle = javascript.replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="description" content="RELIGHT LAB 多光源三维光位控制与 AI 重打光提示词生成器">
  <title>RELIGHT LAB · 多光源重打光控制台</title>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script>${bundle}</script>
</body>
</html>`;

await writeFile(outputPath, html);
console.log(`Built ${outputPath}`);
