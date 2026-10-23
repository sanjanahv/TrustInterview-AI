$ErrorActionPreference = 'Stop'
$inputPath = (Resolve-Path 'C:\Users\sanjana\Desktop\ZTA\output\chunk1\Faculty_Concept_Note_ZTA_AI_Interview.docx').Path
$outDir = 'C:\Users\sanjana\Desktop\ZTA\output\chunk1\rendered'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$pdfPath = Join-Path $outDir 'Faculty_Concept_Note_ZTA_AI_Interview.pdf'
$word = New-Object -ComObject Word.Application
try {
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3
    Write-Output 'Opening document'
    $doc = $word.Documents.Open($inputPath, $false, $true, $false)
    try {
        Write-Output ('Opened pages ' + $doc.ComputeStatistics(2))
        $doc.SaveAs2($pdfPath, 17)
        Write-Output 'Exported PDF'
    }
    finally {
        $doc.Close($false)
    }
}
finally {
    $word.Quit()
}
Write-Output $pdfPath
