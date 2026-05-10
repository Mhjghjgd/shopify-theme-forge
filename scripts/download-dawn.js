const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DAWN_URL = "https://github.com/Shopify/dawn/archive/refs/heads/main.zip";
const DEST_DIR = path.join(process.cwd(), "templates");
const ZIP_PATH = path.join(DEST_DIR, "dawn.zip");
const EXTRACT_DIR = path.join(DEST_DIR, "dawn-base");

if (fs.existsSync(EXTRACT_DIR) && fs.readdirSync(EXTRACT_DIR).length > 0) {
  console.log("Dawn already exists - skipping.");
  process.exit(0);
}

fs.mkdirSync(DEST_DIR, { recursive: true });
console.log("Downloading Shopify Dawn from GitHub...");

function followRedirects(url, dest, callback) {
  const file = fs.createWriteStream(dest);
  function get(u) {
    https.get(u, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return get(res.headers.location);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return callback(new Error("HTTP " + res.statusCode));
      }
      let received = 0;
      res.on("data", (chunk) => {
        received += chunk.length;
        if (received % (1024 * 1024) < chunk.length) {
          process.stdout.write("\r  Downloaded " + Math.round(received / 1024 / 1024) + " MB...");
        }
      });
      res.pipe(file);
      file.on("finish", () => {
        file.close((err) => {
          if (err) return callback(err);
          console.log("\n  Download complete (" + Math.round(received / 1024 / 1024) + " MB)");
          callback(null);
        });
      });
    }).on("error", (err) => { file.close(); callback(err); });
  }
  get(url);
}

followRedirects(DAWN_URL, ZIP_PATH, (err) => {
  if (err) { console.error("Download failed:", err.message); process.exit(1); }
  
  console.log("Extracting zip...");
  
  try {
    // Use Expand-Archive with explicit path quoting
    const zipEscaped = ZIP_PATH.replace(/\\/g, "\\\\");
    const destEscaped = DEST_DIR.replace(/\\/g, "\\\\");
    execSync(
      `powershell -NonInteractive -Command "Expand-Archive -LiteralPath '${ZIP_PATH}' -DestinationPath '${DEST_DIR}' -Force"`,
      { stdio: "inherit" }
    );
  } catch (e) {
    console.error("Extraction failed:", e.message);
    process.exit(1);
  }
  
  // Find and rename extracted folder
  const items = fs.readdirSync(DEST_DIR);
  const extracted = items.find(f => f.toLowerCase().startsWith("dawn-") && fs.statSync(path.join(DEST_DIR, f)).isDirectory());
  if (extracted && extracted !== "dawn-base") {
    fs.renameSync(path.join(DEST_DIR, extracted), EXTRACT_DIR);
    console.log("Renamed " + extracted + " -> dawn-base");
  }
  
  // Cleanup zip
  try { fs.unlinkSync(ZIP_PATH); } catch {}
  
  const count = fs.readdirSync(EXTRACT_DIR).length;
  console.log("Dawn base theme ready at templates/dawn-base/ (" + count + " items)");
});
