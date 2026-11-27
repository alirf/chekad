$ErrorActionPreference = 'Stop'
$paths = @(
  'services/auth/entrypoint.sh',
  'services/application/entrypoint.sh',
  'services/people/entrypoint.sh',
  'services/content/entrypoint.sh'
)
foreach ($path in $paths) {
  if (Test-Path $path) {
    Remove-Item $path -Force
    Write-Host "Removed obsolete startup migration script: $path"
  }
}
