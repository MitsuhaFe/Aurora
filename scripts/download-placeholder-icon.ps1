# Aurora 项目 - 下载占位图标脚本
# 用于快速获取一个临时的 icon.ico 文件以便开发

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Aurora 项目 - 下载占位图标" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 目标目录
$iconsDir = "src-tauri\icons"
$iconPath = "$iconsDir\icon.ico"

# 创建目录（如果不存在）
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
    Write-Host "✓ 创建图标目录: $iconsDir" -ForegroundColor Green
}

# 检查是否已存在
if (Test-Path $iconPath) {
    Write-Host "! 图标文件已存在: $iconPath" -ForegroundColor Yellow
    $overwrite = Read-Host "是否覆盖? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "操作已取消" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "正在下载占位图标..." -ForegroundColor Cyan

# 使用 Tauri 官方的示例图标作为占位
$iconUrl = "https://raw.githubusercontent.com/tauri-apps/tauri/dev/tooling/cli/templates/app/app-icon.png"

try {
    # 下载 PNG 图片
    $tempPng = "$env:TEMP\aurora-temp-icon.png"
    Invoke-WebRequest -Uri $iconUrl -OutFile $tempPng -UseBasicParsing
    
    Write-Host "✓ 下载成功" -ForegroundColor Green
    Write-Host ""
    Write-Host "注意: 下载的是 PNG 格式" -ForegroundColor Yellow
    Write-Host "建议使用在线工具转换为 ICO 格式:" -ForegroundColor Yellow
    Write-Host "  1. 访问 https://convertio.co/png-ico/" -ForegroundColor White
    Write-Host "  2. 上传 $tempPng" -ForegroundColor White
    Write-Host "  3. 下载转换后的 .ico 文件" -ForegroundColor White
    Write-Host "  4. 重命名为 icon.ico 并放到 $iconsDir\" -ForegroundColor White
    Write-Host ""
    
    # 将 PNG 复制为占位（虽然不是正确的 ICO 格式，但有些情况可以用）
    Copy-Item $tempPng -Destination $iconPath -Force
    
    Write-Host "✓ 临时占位文件已创建: $iconPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  注意: 这是 PNG 格式的占位文件" -ForegroundColor Red
    Write-Host "⚠️  如果编译失败，请使用在线工具转换为真正的 ICO 格式" -ForegroundColor Red
    Write-Host ""
    
} catch {
    Write-Host "✗ 下载失败: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "请手动下载图标:" -ForegroundColor Yellow
    Write-Host "  1. 访问 https://favicon.io/favicon-generator/" -ForegroundColor White
    Write-Host "  2. 生成一个简单的图标（如字母 A）" -ForegroundColor White
    Write-Host "  3. 下载并重命名为 icon.ico" -ForegroundColor White
    Write-Host "  4. 放到 $iconsDir\" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "下一步: 运行 pnpm tauri dev" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan

