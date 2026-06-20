# Moves sprite PNG files from the top-level assets folder into the Vite project's assets/towers/
# Run this after downloading sprites from the sprite-splitter tool.

$src  = "c:\dev\tower-defence\tower-defense\assets"
$dest = "c:\dev\tower-defence\tower-defense\tower-defense\assets\towers"

$knownSprites = @(
  "barbarian_sprites.png",
  "archer_sprites.png",
  "dvarg_sprites.png",
  "brynhild_sprites.png",
  "valkyria_sprites.png",
  "vildeman_sprites.png",
  "ismaciker_sprites.png"
)

foreach ($file in $knownSprites) {
  $srcPath  = Join-Path $src  $file
  $destPath = Join-Path $dest $file
  if (Test-Path $srcPath) {
    Move-Item $srcPath $destPath -Force
    Write-Host "Moved: $file" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Done. Files are now in:" -ForegroundColor Cyan
Write-Host "  $dest" -ForegroundColor Cyan
