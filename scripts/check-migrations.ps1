$ErrorActionPreference = 'Stop'

Write-Host '== Compose configuration =='
docker compose config --quiet

Write-Host '== Container status =='
docker compose ps -a

$services = @('auth', 'application', 'people', 'content')
foreach ($service in $services) {
    $migration = "migrate-$service"
    Write-Host "== Migration job: $migration =="
    docker compose ps -a $migration
    docker compose logs --no-color --tail=80 $migration
}

$apiServices = @('auth-service', 'application-service', 'people-service', 'content-service')
foreach ($service in $apiServices) {
    Write-Host "== API service: $service =="
    docker compose ps $service
}

Write-Host '== HTTP health checks through gateway =='
$urls = @(
    'http://localhost:8080/api/auth/health',
    'http://localhost:8080/api/application/health',
    'http://localhost:8080/api/people/health',
    'http://localhost:8080/api/content/health'
)
foreach ($url in $urls) {
    try {
        $response = Invoke-RestMethod -Uri $url -TimeoutSec 10
        Write-Host "$url => $($response | ConvertTo-Json -Compress)"
    }
    catch {
        Write-Error "Health check failed: $url`n$($_.Exception.Message)"
    }
}

Write-Host '== Migration version checks =='
$commands = @(
    @('migrate-auth', 'alembic', 'current'),
    @('migrate-application', 'alembic', 'current'),
    @('migrate-people', 'alembic', 'current'),
    @('migrate-content', 'alembic', 'current')
)
foreach ($item in $commands) {
    $service = $item[0]
    $args = $item[1..($item.Length - 1)]
    Write-Host "-- $service $($args -join ' ')"
    docker compose run --rm --no-deps $service @args
}

Write-Host 'Validation commands completed. Inspect output for any failed job or non-zero exit.'
