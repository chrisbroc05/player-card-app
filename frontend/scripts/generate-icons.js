import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 512];

const inputFile = path.join(__dirname, "../public/prospect-legends-logo.png");
const outputDir = path.join(__dirname, "../public/icons");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

Promise.all(
  sizes.map((size) =>
    sharp(inputFile)
      .resize(size, size, {
        fit: "contain",
        background: { r: 10, g: 10, b: 10, alpha: 1 },
      })
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
  )
)
  .then(() => {
    console.log("All icons generated successfully");
  })
  .catch(console.error);
