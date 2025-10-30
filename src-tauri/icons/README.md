# 图标文件说明

当前缺少以下图标文件，这会导致 Tauri 构建时出现警告（但不影响运行）：

## 需要的图标文件

- `32x32.png` - 32x32 像素 PNG 图标
- `128x128.png` - 128x128 像素 PNG 图标
- `128x128@2x.png` - 256x256 像素 PNG 图标（高DPI）
- `icon.icns` - macOS 应用图标
- `icon.ico` - Windows 应用图标
- `icon.png` - 系统托盘图标

## 临时解决方案

在开发阶段，你可以：

1. **忽略警告** - 不影响开发运行
2. **使用在线工具生成图标**：
   - https://icon.kitchen/
   - https://www.icoconverter.com/
3. **从现有图片生成**：
   - 准备一张 512x512 或更大的 PNG 图片
   - 使用 ImageMagick 或在线工具生成多个尺寸

## 快速生成（如果你有一张图片）

使用在线工具 [App Icon Generator](https://appicon.co/) 可以一次性生成所有需要的尺寸。

## 生产环境

在发布前务必准备好所有图标文件，以确保：
- Windows 任务栏显示正确
- macOS Dock 显示正确
- 系统托盘图标正常
- 安装包图标美观

