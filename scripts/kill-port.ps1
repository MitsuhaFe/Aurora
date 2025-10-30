# 关闭占用 5173 端口的进程
Write-Host "正在查找占用端口 5173 的进程..." -ForegroundColor Cyan

$port = 5173
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($connections) {
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-Host "找到进程: $($process.ProcessName) (PID: $processId)" -ForegroundColor Yellow
            Write-Host "正在关闭..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force
            Write-Host "✓ 进程已关闭" -ForegroundColor Green
        }
    }
} else {
    Write-Host "端口 5173 未被占用" -ForegroundColor Green
}

Write-Host "`n现在可以运行: pnpm tauri dev" -ForegroundColor Cyan

