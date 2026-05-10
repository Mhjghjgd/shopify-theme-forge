$DAWN_DIR = "templates\dawn-base"
$DAWN_URL = "https://github.com/Shopify/dawn/archive/refs/heads/main.zip"
$ZIP_PATH = "templates\dawn.zip"
$EXTRACT_TEMP = "templates\dawn-main"

Write-Host "Setting up Shopify Dawn base theme..." -ForegroundColor Cyan

if ((Test-Path $DAWN_DIR) -and (Get-ChildItem $DAWN_DIR).Count -gt 0) {
    Write-Host "Dawn already exists at $DAWN_DIR - skipping." -ForegroundColor Green
    exit 0
}

New-Item -ItemType Directory -Path "templates" -Force | Out-Null

Write-Host "Downloading Dawn from GitHub (~1MB)..." -ForegroundColor Yellow
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $DAWN_URL -OutFile $ZIP_PATH -UseBasicParsing
Write-Host "Extracting..." -ForegroundColor Yellow
Expand-Archive -LiteralPath $ZIP_PATH -DestinationPath "templates" -Force

if (Test-Path $EXTRACT_TEMP) {
    if (Test-Path $DAWN_DIR) { Remove-Item $DAWN_DIR -Recurse -Force }
    Rename-Item -Path $EXTRACT_TEMP -NewName "dawn-base"
} else {
    $extracted = Get-ChildItem "templates" -Directory | Where-Object { $_.Name -like "dawn-*" -and $_.Name -ne "dawn-base" } | Select-Object -First 1
    if ($extracted) { Rename-Item -Path $extracted.FullName -NewName "dawn-base" }
}

Remove-Item $ZIP_PATH -Force -ErrorAction SilentlyContinue

$count = (Get-ChildItem $DAWN_DIR).Count
Write-Host "Dawn ready at $DAWN_DIR ($count items)" -ForegroundColor Green
Write-Host "You can now run: npm run dev" -ForegroundColor Green