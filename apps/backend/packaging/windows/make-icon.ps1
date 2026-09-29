# Draws Clyro's app icon - the website favicon's design (apps/website/src/app/icon.svg): a bold
# light "C" on a dark rounded square - and writes it as a multi-size clyro.ico next to this script.
# Run once and commit the result; the Windows build only reads clyro.ico.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File make-icon.ps1

Add-Type -AssemblyName System.Drawing

$sizes = 16, 24, 32, 48, 256
$background = [System.Drawing.Color]::FromArgb(255, 0x12, 0x0d, 0x0c)
$foreground = [System.Drawing.Color]::FromArgb(255, 0xf5, 0xf3, 0xf1)

function New-IconBitmap([int]$size) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  # Rounded square: corner radius 112/512 of the side, as in icon.svg.
  $diameter = [single]($size * 224 / 512)
  $edge = [single]($size - $diameter)
  $square = New-Object System.Drawing.Drawing2D.GraphicsPath
  $square.AddArc(0, 0, $diameter, $diameter, 180, 90)
  $square.AddArc($edge, 0, $diameter, $diameter, 270, 90)
  $square.AddArc($edge, $edge, $diameter, $diameter, 0, 90)
  $square.AddArc(0, $edge, $diameter, $diameter, 90, 90)
  $square.CloseFigure()
  $graphics.FillPath((New-Object System.Drawing.SolidBrush $background), $square)

  # The "C", scaled so its height is ~45% of the side (Arial 900 at 320/512 in icon.svg), centred on
  # its actual outline rather than the font's line box so it sits visually in the middle.
  $letter = New-Object System.Drawing.Drawing2D.GraphicsPath
  $letter.AddString('C', (New-Object System.Drawing.FontFamily 'Arial Black'), 0, 100, (New-Object System.Drawing.PointF 0, 0), [System.Drawing.StringFormat]::GenericTypographic)
  $bounds = $letter.GetBounds()
  $scale = ($size * 0.45) / $bounds.Height
  $matrix = New-Object System.Drawing.Drawing2D.Matrix
  $matrix.Translate([single]($size / 2), [single]($size / 2))
  $matrix.Scale([single]$scale, [single]$scale)
  $matrix.Translate([single](-($bounds.X + $bounds.Width / 2)), [single](-($bounds.Y + $bounds.Height / 2)))
  $letter.Transform($matrix)
  $graphics.FillPath((New-Object System.Drawing.SolidBrush $foreground), $letter)

  $graphics.Dispose()
  return $bitmap
}

# Large sizes are stored as PNG; small ones as classic 32-bit bitmaps, which every Windows API that
# loads tray and window icons understands.
function Get-PngBytes($bitmap) {
  $stream = New-Object System.IO.MemoryStream
  $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  return ,$stream.ToArray()
}

function Get-BitmapBytes($bitmap) {
  $size = $bitmap.Width
  $stream = New-Object System.IO.MemoryStream
  $writer = New-Object System.IO.BinaryWriter $stream
  # BITMAPINFOHEADER; the height is doubled because an icon bitmap is followed by its AND mask.
  $writer.Write([int]40); $writer.Write([int]$size); $writer.Write([int]($size * 2))
  $writer.Write([int16]1); $writer.Write([int16]32)
  for ($i = 0; $i -lt 6; $i++) { $writer.Write([int]0) }
  for ($y = $size - 1; $y -ge 0; $y--) {
    for ($x = 0; $x -lt $size; $x++) {
      $pixel = $bitmap.GetPixel($x, $y)
      $writer.Write([byte]$pixel.B); $writer.Write([byte]$pixel.G); $writer.Write([byte]$pixel.R); $writer.Write([byte]$pixel.A)
    }
  }
  # All-zero AND mask: transparency comes from the alpha channel. Rows are padded to 4 bytes.
  $maskRowBytes = [Math]::Ceiling($size / 32) * 4
  $writer.Write((New-Object byte[] ($maskRowBytes * $size)))
  $writer.Flush()
  return ,$stream.ToArray()
}

$images = foreach ($size in $sizes) {
  $bitmap = New-IconBitmap $size
  if ($size -ge 256) { , (Get-PngBytes $bitmap) } else { , (Get-BitmapBytes $bitmap) }
  $bitmap.Dispose()
}

$output = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $output
$writer.Write([int16]0); $writer.Write([int16]1); $writer.Write([int16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $dimension = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }  # 0 means 256 in an icon directory
  $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
  $writer.Write([byte]0); $writer.Write([byte]0)
  $writer.Write([int16]1); $writer.Write([int16]32)
  $writer.Write([int]$images[$i].Length); $writer.Write([int]$offset)
  $offset += $images[$i].Length
}
foreach ($image in $images) { $writer.Write($image) }
$writer.Flush()

$path = Join-Path $PSScriptRoot 'clyro.ico'
[System.IO.File]::WriteAllBytes($path, $output.ToArray())
Write-Output "Wrote $path"
