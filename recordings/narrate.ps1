$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$chapters = Get-Content -LiteralPath 'recordings/chapters.json' -Raw | ConvertFrom-Json
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.SelectVoice('Microsoft Zira Desktop')
$voice.Rate = 1
for ($index = 0; $index -lt $chapters.Count; $index++) {
  $target = Join-Path (Get-Location) ('recordings/.work/narration-' + $index + '.wav')
  $voice.SetOutputToWaveFile($target)
  $voice.Speak($chapters[$index].narration)
}
$voice.Dispose()
Write-Output 'Offline narration rendered.'
