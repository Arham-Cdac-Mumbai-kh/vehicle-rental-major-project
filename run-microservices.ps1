Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Starting Vehicle Rental Microservices...     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "1. Starting Eureka Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd eureka-server; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 15

Write-Host "2. Starting User Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd user-service; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 4

Write-Host "3. Starting Vehicle Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd vehicle-service; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 4

Write-Host "4. Starting Booking Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd booking-service; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 4

Write-Host "5. Starting Payment Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd payment-service; .\mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 4

Write-Host "6. Starting API Gateway..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd api-gateway; .\mvnw.cmd spring-boot:run"

Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "All services started in separate windows!" -ForegroundColor Yellow
Write-Host "Check the opened terminal windows to see logs." -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
