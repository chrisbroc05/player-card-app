import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputFile = path.join(__dirname, "../public/prospect-legends-logo.png");
const outputDir = path.join(__dirname, "../public");

Promise.all([
  sharp(inputFile)
    .resize(192, 192, {
      fit: "contain",
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    })
    .png()
    .toFile(path.join(outputDir, "pwa-192.png")),
  sharp(inputFile)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    })
    .png()
    .toFile(path.join(outputDir, "pwa-512.png")),
  sharp(inputFile)
    .resize(180, 180, {
      fit: "contain",
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    })
    .png()
    .toFile(path.join(outputDir, "apple-touch-icon.png")),
])
  .then(() => {
    console.log("Icons generated successfully");
  })
  .catch(console.error);
