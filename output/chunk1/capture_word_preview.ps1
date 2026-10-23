$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinCapture {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
}
'@
$inputPath = (Resolve-Path 'C:\Users\sanjana\Desktop\ZTA\output\chunk1\Faculty_Concept_Note_ZTA_AI_Interview_v2.docx').Path
$pngPath = 'C:\Users\sanjana\Desktop\ZTA\output\chunk1\rendered\page-1.png'
New-Item -ItemType Directory -Force -Path (Split-Path $pngPath) | Out-Null
$word = New-Object -ComObject Word.Application
try {
  $word.DisplayAlerts = 0
  $word.Visible = $true
  $doc = $word.Documents.Open($inputPath, $false, $true, $false)
  try {
    $window = $doc.ActiveWindow
    $window.WindowState = 1
    $window.View.Type = 3
    try { $word.CommandBars.ExecuteMso('MinimizeRibbon') } catch {}
    $window.View.Zoom.PageFit = 1
    Start-Sleep -Seconds 2
    $hwnd = [IntPtr]$window.Hwnd
    $rect = New-Object WinCapture+RECT
    [WinCapture]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
    $width = $rect.Right - $rect.Left
    $height = $rect.Bottom - $rect.Top
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $hdc = $graphics.GetHdc()
      try { [WinCapture]::PrintWindow($hwnd, $hdc, 2) | Out-Null }
      finally { $graphics.ReleaseHdc($hdc) }
    }
    finally { $graphics.Dispose() }
    $bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output $pngPath
  }
  finally { $doc.Close($false) }
}
finally { $word.Quit() }
