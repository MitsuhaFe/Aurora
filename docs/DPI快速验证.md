# DPI 缩放修复 - 快速验证指南

## 🎯 快速测试（5分钟）

### 步骤 1: 查看你的 DPI 设置

1. 右键桌面 → **显示设置**
2. 找到 **"缩放与布局"**
3. 记下当前缩放比例

**常见设置：**
```
100% (推荐) ← 1920x1080 屏幕
125% (推荐) ← 1920x1080 屏幕（高 DPI）
150% (推荐) ← 2560x1440 或 4K 屏幕
200% (推荐) ← 4K 屏幕
```

---

### 步骤 2: 启动应用

```bash
cd d:\CodeProject\PBL2\Aurora\Aurora
pnpm tauri:dev
```

**打开 DevTools (F12)** 以查看日志

---

### 步骤 3: 设置动态壁纸

1. 点击 "壁纸" 🖼️
2. 选择 "视频壁纸"
3. 选择一个视频文件
4. 点击 "应用壁纸"

---

### 步骤 4: 查看日志

**在控制台中查找以下信息：**

```
Monitor resolution (DPI-aware): 1920x1080  ← 你的真实屏幕分辨率
DPI: 120x120 (96 = 100%, 120 = 125%, 144 = 150%)  ← 你的 DPI 值
DPI Scale: 125%  ← 你的缩放比例
```

---

### 步骤 5: 验证视频效果

✅ **检查清单：**
- [ ] 视频完全填满屏幕（无黑边）
- [ ] 画面比例正确（不拉伸）
- [ ] 画面清晰（不模糊）
- [ ] 桌面图标可见

---

## 🔍 对照表

### 你应该看到什么

| 你的缩放 | 屏幕分辨率 | 日志应显示 | 视频尺寸应为 |
|---------|-----------|-----------|------------|
| 100% | 1920x1080 | DPI: 96 | 1920x1080 ✅ |
| 125% | 1920x1080 | DPI: 120 | 1920x1080 ✅ |
| 150% | 1920x1080 | DPI: 144 | 1920x1080 ✅ |
| 150% | 2560x1440 | DPI: 144 | 2560x1440 ✅ |
| 200% | 3840x2160 | DPI: 192 | 3840x2160 ✅ |

---

## ❌ 如果出现问题

### 问题 1: 视频有黑边

**可能原因：**
- 视频分辨率与屏幕不匹配
- DPI 获取失败

**解决方法：**
1. 查看日志中的 `Monitor resolution` 是否正确
2. 尝试使用不同的视频文件
3. 检查视频原始分辨率（应该与屏幕接近）

---

### 问题 2: 画面模糊

**可能原因：**
- 视频分辨率太低
- 使用了逻辑像素而非物理像素

**解决方法：**
1. 确认日志显示正确的物理分辨率
2. 使用高清视频（1080p 或更高）
3. 检查 `DPI Scale` 是否正确显示

---

### 问题 3: 视频拉伸

**可能原因：**
- 视频宽高比与屏幕不匹配

**解决方法：**
1. 使用与屏幕比例相同的视频（16:9, 16:10, 21:9）
2. 视频会自动缩放，但保持原始宽高比

---

## 📊 示例日志（正常）

```
=== 100% DPI 缩放 ===
Monitor resolution (DPI-aware): 1920x1080
DPI: 96x96 (96 = 100%, 120 = 125%, 144 = 150%)
DPI Scale: 100%
ffplay process created. PID: 12345
Found SDL_app window
Successfully set video as desktop background

=== 125% DPI 缩放 ===
Monitor resolution (DPI-aware): 1920x1080  ← 正确！不是1536x864
DPI: 120x120
DPI Scale: 125%
ffplay process created. PID: 12345
Found SDL_app window
Successfully set video as desktop background

=== 150% DPI 缩放 ===
Monitor resolution (DPI-aware): 1920x1080  ← 正确！不是1280x720
DPI: 144x144
DPI Scale: 150%
ffplay process created. PID: 12345
Found SDL_app window
Successfully set video as desktop background
```

---

## ✅ 验证成功标志

如果你看到以下所有项，说明修复成功：

1. ✅ 日志显示正确的物理分辨率
2. ✅ 日志显示正确的 DPI 值
3. ✅ 视频完全填满屏幕
4. ✅ 画面清晰不模糊
5. ✅ 无拉伸或压缩

---

## 🚀 其他 DPI 测试

### 测试不同 DPI 设置

1. **保持应用运行**
2. **修改 Windows 缩放设置**：
   - 右键桌面 → 显示设置
   - 更改"缩放与布局"
   - 点击"应用"
   - 可能需要重启应用
3. **重新设置壁纸**
4. **验证新的 DPI 下仍然正常**

---

## 💡 专业提示

### 查看实时 DPI 信息

在 PowerShell 中运行：
```powershell
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
Write-Host "屏幕分辨率: $($screen.Bounds.Width)x$($screen.Bounds.Height)"
Write-Host "工作区域: $($screen.WorkingArea.Width)x$($screen.WorkingArea.Height)"
```

### 监控 ffplay 进程

```powershell
# 持续监控
while ($true) {
    Clear-Host
    Write-Host "=== FFplay 进程 ==="
    tasklist | findstr ffplay
    Start-Sleep -Seconds 1
}
```

---

## 📸 截图对比

### 修复前（125% DPI，错误）
```
屏幕: 1920x1080 (物理)
获取: 1536x864 (逻辑) ← 错误
视频: 1536x864 播放
结果: 有黑边、拉伸、模糊 ❌
```

### 修复后（125% DPI，正确）
```
屏幕: 1920x1080 (物理)
获取: 1920x1080 (物理) ← 正确
视频: 1920x1080 播放
结果: 完美填充、清晰 ✅
```

---

## 🎉 验证完成

如果所有测试都通过，恭喜！DPI 缩放问题已完全解决。

现在你可以：
- ✅ 在任何 DPI 设置下使用动态壁纸
- ✅ 享受高清、完整的视频壁纸体验
- ✅ 自由切换 Windows 缩放设置

---

**快速测试时间：** < 5 分钟  
**推荐测试 DPI：** 100%, 125%, 150%  
**状态：** ✅ 准备就绪

