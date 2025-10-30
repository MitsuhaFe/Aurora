#include "WallpaperModule.h"
#include <iostream>
#include <codecvt>
#include <locale>
#include <shlobj.h>

WallpaperModule::WallpaperModule() 
    : videoWindow(nullptr)
    , isVideoPlaying(false)
    , currentWallpaperPath("")
{
    ZeroMemory(&videoProcess, sizeof(videoProcess));
}

WallpaperModule::~WallpaperModule() {
    stopWallpaper();
}

// ==================== 静态壁纸实现 ====================

bool WallpaperModule::setStaticWallpaper(const std::string& imagePath) {
    std::wstring wImagePath = StringToWString(imagePath);
    
    // 检查文件是否存在
    if (!FileExists(wImagePath)) {
        std::cerr << "Error: Image file does not exist: " << imagePath << std::endl;
        return false;
    }

    // 首先尝试方法1（SystemParametersInfo）
    if (setStaticWallpaperMethod1(wImagePath)) {
        currentWallpaperPath = imagePath;
        return true;
    }

    // 如果方法1失败，尝试方法2（注册表）
    if (setStaticWallpaperMethod2(wImagePath)) {
        currentWallpaperPath = imagePath;
        return true;
    }

    return false;
}

bool WallpaperModule::setStaticWallpaperMethod1(const std::wstring& imagePath) {
    // 使用 SystemParametersInfo API
    // SPIF_UPDATEINIFILE: 更新用户配置文件
    // SPIF_SENDCHANGE: 广播 WM_SETTINGCHANGE 消息
    BOOL result = SystemParametersInfoW(
        SPI_SETDESKWALLPAPER,
        0,
        (PVOID)imagePath.c_str(),
        SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
    );

    return result != 0;
}

bool WallpaperModule::setStaticWallpaperMethod2(const std::wstring& imagePath) {
    HKEY hKey;
    const wchar_t* regPath = L"Control Panel\\Desktop";

    // 打开注册表键
    if (RegOpenKeyExW(HKEY_CURRENT_USER, regPath, 0, KEY_SET_VALUE, &hKey) != ERROR_SUCCESS) {
        return false;
    }

    // 设置壁纸路径
    RegSetValueExW(hKey, L"Wallpaper", 0, REG_SZ,
                   (BYTE*)imagePath.c_str(),
                   (imagePath.length() + 1) * sizeof(wchar_t));

    // 设置壁纸样式 (0=居中, 2=拉伸, 6=适应, 10=填充, 22=跨区)
    const wchar_t* style = L"10";  // 填充
    RegSetValueExW(hKey, L"WallpaperStyle", 0, REG_SZ,
                   (BYTE*)style, (wcslen(style) + 1) * sizeof(wchar_t));

    // 设置平铺方式 (0=不平铺, 1=平铺)
    const wchar_t* tile = L"0";
    RegSetValueExW(hKey, L"TileWallpaper", 0, REG_SZ,
                   (BYTE*)tile, (wcslen(tile) + 1) * sizeof(wchar_t));

    RegCloseKey(hKey);

    // 通知系统更新壁纸
    SystemParametersInfoW(SPI_SETDESKWALLPAPER, 0, NULL, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE);

    return true;
}

// ==================== 动态壁纸实现 ====================

bool WallpaperModule::setDynamicWallpaper(const std::string& videoPath) {
    std::wstring wVideoPath = StringToWString(videoPath);
    
    // 检查文件是否存在
    if (!FileExists(wVideoPath)) {
        std::cerr << "Error: Video file does not exist: " << videoPath << std::endl;
        return false;
    }

    // 如果已经有视频在播放，先停止
    if (isVideoPlaying) {
        stopWallpaper();
    }

    // 获取真实的物理分辨率（使用 EnumDisplaySettings）
    int screenWidth = 0;
    int screenHeight = 0;
    
    // 方法1: 使用 EnumDisplaySettings 获取真实的物理分辨率（最可靠）
    DEVMODEW devMode;
    ZeroMemory(&devMode, sizeof(devMode));
    devMode.dmSize = sizeof(devMode);
    
    if (EnumDisplaySettingsW(NULL, ENUM_CURRENT_SETTINGS, &devMode)) {
        screenWidth = devMode.dmPelsWidth;
        screenHeight = devMode.dmPelsHeight;
        
        std::cout << "=== Display Settings (Physical Resolution) ===" << std::endl;
        std::cout << "Resolution: " << screenWidth << "x" << screenHeight << std::endl;
        std::cout << "Refresh Rate: " << devMode.dmDisplayFrequency << " Hz" << std::endl;
        std::cout << "Bits Per Pixel: " << devMode.dmBitsPerPel << std::endl;
    }
    
    // 方法2: 备用方案 - 使用 MonitorInfo（如果方法1失败）
    if (screenWidth == 0 || screenHeight == 0) {
        HWND hDesktop = GetDesktopWindow();
        HMONITOR hMonitor = MonitorFromWindow(hDesktop, MONITOR_DEFAULTTOPRIMARY);
        
        MONITORINFO monitorInfo;
        monitorInfo.cbSize = sizeof(MONITORINFO);
        
        if (GetMonitorInfoW(hMonitor, &monitorInfo)) {
            screenWidth = monitorInfo.rcMonitor.right - monitorInfo.rcMonitor.left;
            screenHeight = monitorInfo.rcMonitor.bottom - monitorInfo.rcMonitor.top;
            std::cout << "Using MonitorInfo: " << screenWidth << "x" << screenHeight << std::endl;
        }
    }
    
    // 方法3: 最后备用方案
    if (screenWidth == 0 || screenHeight == 0) {
        screenWidth = GetSystemMetrics(SM_CXSCREEN);
        screenHeight = GetSystemMetrics(SM_CYSCREEN);
        std::cout << "Using GetSystemMetrics: " << screenWidth << "x" << screenHeight << std::endl;
    }
    
    // 输出 DPI 信息用于调试
    HDC hdc = GetDC(NULL);
    if (hdc) {
        int dpiX = GetDeviceCaps(hdc, LOGPIXELSX);
        int dpiY = GetDeviceCaps(hdc, LOGPIXELSY);
        int logPixelsX = GetSystemMetrics(SM_CXSCREEN);
        int logPixelsY = GetSystemMetrics(SM_CYSCREEN);
        
        std::cout << "DPI: " << dpiX << "x" << dpiY << " (Standard: 96)" << std::endl;
        std::cout << "DPI Scale: " << (dpiX * 100 / 96) << "%" << std::endl;
        std::cout << "Logical Pixels (GetSystemMetrics): " << logPixelsX << "x" << logPixelsY << std::endl;
        std::cout << "Physical Pixels (EnumDisplaySettings): " << screenWidth << "x" << screenHeight << std::endl;
        
        ReleaseDC(NULL, hdc);
    }
    
    std::cout << "=== Final Video Resolution: " << screenWidth << "x" << screenHeight << " ===" << std::endl;

    // 构建 ffplay 命令
    // 注意：这里假设 ffplay.exe 在系统 PATH 中或在指定位置
    std::wstring commandLine = L"ffplay.exe \"" + wVideoPath + 
                               L"\" -noborder -x " + std::to_wstring(screenWidth) +
                               L" -y " + std::to_wstring(screenHeight) +
                               L" -loop 0";

    STARTUPINFOW si = { 0 };
    si.cb = sizeof(STARTUPINFOW);
    
    // 创建 ffplay 进程
    if (!CreateProcessW(
        NULL,                           // 应用程序名称
        (LPWSTR)commandLine.c_str(),   // 命令行
        NULL,                           // 进程安全属性
        NULL,                           // 线程安全属性
        FALSE,                          // 句柄继承
        0,                              // 创建标志
        NULL,                           // 环境
        NULL,                           // 当前目录
        &si,                            // 启动信息
        &videoProcess                   // 进程信息
    )) {
        std::cerr << "Failed to create ffplay process. Error: " << GetLastError() << std::endl;
        return false;
    }

    std::cout << "ffplay process created. PID: " << videoProcess.dwProcessId << std::endl;

    // 等待窗口创建
    Sleep(1000);

    // 尝试查找 SDL 窗口
    HWND hFfplay = NULL;
    for (int i = 0; i < 5; i++) {
        hFfplay = FindWindowW(L"SDL_app", 0);
        if (hFfplay != NULL) {
            std::cout << "Found SDL_app window" << std::endl;
            break;
        }
        Sleep(200);
    }

    // 如果没找到 SDL_app，尝试 SDL_Window
    if (hFfplay == NULL) {
        hFfplay = FindWindowW(L"SDL_Window", 0);
        if (hFfplay != NULL) {
            std::cout << "Found SDL_Window window" << std::endl;
        }
    }

    if (hFfplay == NULL) {
        std::cerr << "Failed to find SDL window" << std::endl;
        TerminateProcess(videoProcess.hProcess, 0);
        CloseHandle(videoProcess.hProcess);
        CloseHandle(videoProcess.hThread);
        return false;
    }

    videoWindow = hFfplay;

    // 刷新桌面
    SystemParametersInfoW(SPI_SETDESKWALLPAPER, 0, NULL, SPIF_UPDATEINIFILE);

    // 将窗口设置为桌面背景
    RECT bounds = { 0, 0, screenWidth, screenHeight };
    if (SendHandleToDesktopBottom(hFfplay, &bounds)) {
        std::cout << "Successfully set video as desktop background" << std::endl;
        isVideoPlaying = true;
        currentWallpaperPath = videoPath;
        return true;
    } else {
        std::cerr << "Failed to set video as desktop background" << std::endl;
        TerminateProcess(videoProcess.hProcess, 0);
        CloseHandle(videoProcess.hProcess);
        CloseHandle(videoProcess.hThread);
        return false;
    }
}

void WallpaperModule::stopWallpaper() {
    if (isVideoPlaying && videoProcess.hProcess != NULL) {
        std::cout << "Stopping video wallpaper..." << std::endl;
        
        // 如果视频窗口存在，先销毁它
        if (videoWindow != NULL && IsWindow(videoWindow)) {
            std::cout << "Destroying video window..." << std::endl;
            DestroyWindow(videoWindow);
            videoWindow = NULL;
        }
        
        // 终止 ffplay 进程
        std::cout << "Terminating ffplay process..." << std::endl;
        TerminateProcess(videoProcess.hProcess, 0);
        
        // 等待进程完全退出
        WaitForSingleObject(videoProcess.hProcess, 2000);
        
        // 关闭句柄
        CloseHandle(videoProcess.hProcess);
        CloseHandle(videoProcess.hThread);
        
        // 清理状态
        ZeroMemory(&videoProcess, sizeof(videoProcess));
        videoWindow = NULL;
        isVideoPlaying = false;
        
        std::cout << "Video wallpaper stopped successfully" << std::endl;
    } else {
        std::cout << "No video wallpaper running" << std::endl;
    }
}

std::string WallpaperModule::getCurrentWallpaperPath() const {
    return currentWallpaperPath;
}

// ==================== WorkerW 窗口相关 ====================

void WallpaperModule::CreateWorkerW() {
    HWND hProgman = FindWindowW(L"Progman", NULL);
    if (hProgman == NULL) return;
    
    // 发送特殊消息创建 WorkerW
    SendMessageTimeoutW(hProgman, 0x052C, 0xD, 0x1, SMTO_NORMAL, 1000, NULL);
}

HWND WallpaperModule::GetWorkerW() {
    HWND hWorkerW = NULL;
    CreateWorkerW();
    
    // 枚举窗口回调函数
    EnumWindows([](HWND tophandle, LPARAM topparamhandle) -> BOOL {
        HWND shelldll_defview = FindWindowExW(tophandle, NULL, L"SHELLDLL_DefView", NULL);
        
        if (shelldll_defview != NULL) {
            wchar_t className[256] = {0};
            GetClassNameW(tophandle, className, 256);
            if (wcscmp(className, L"WorkerW") != 0) {
                return TRUE;
            }
            // 找到 WorkerW 窗口
            HWND* hWorkerW = (HWND*)topparamhandle;
            *hWorkerW = FindWindowExW(NULL, tophandle, L"WorkerW", NULL);
            return FALSE;
        }
        return TRUE;
    }, (LPARAM)&hWorkerW);
    
    // 如果没找到，尝试在 Progman 下查找
    if (hWorkerW == NULL) {
        HWND hProgman = FindWindowW(L"Progman", NULL);
        if (hProgman != NULL) {
            hWorkerW = FindWindowExW(hProgman, NULL, L"WorkerW", NULL);
        }
    }
    
    return hWorkerW;
}

bool WallpaperModule::SendHandleToDesktopBottom(HWND hwnd, RECT* bounds) {
    if (hwnd == NULL || bounds == NULL) return false;

    HWND hWorkerW = GetWorkerW();
    if (hWorkerW == NULL) {
        std::cerr << "Failed to get WorkerW window" << std::endl;
        return false;
    }

    // 设置窗口样式
    AddWindowStyle(hwnd, WS_CHILD);
    RemoveWindowStyle(hwnd, WS_POPUP);
    AddExtendedStyle(hwnd, WS_EX_LAYERED);
    AddExtendedStyle(hwnd, WS_EX_NOACTIVATE);
    AddExtendedStyle(hwnd, WS_EX_TOOLWINDOW);
    RemoveExtendedStyle(hwnd, WS_EX_ACCEPTFILES);

    // 刷新以便更新窗口样式
    SetLayeredWindowAttributes(hwnd, 0, 255, LWA_ALPHA);
    UpdateWindow(hwnd);
    ShowWindow(hwnd, SW_SHOW);

    // 先将窗口移到屏幕外
    SetWindowPos(hwnd, NULL, -10000, 0, 0, 0, SWP_NOACTIVATE);

    // 尝试设置父窗口
    HWND res = NULL;
    int attempts = 0;
    const int maxAttempts = 50;
    
    while (res == NULL && attempts < maxAttempts) {
        res = SetParent(hwnd, hWorkerW);
        if (res == NULL) {
            Sleep(100);
        }
        attempts++;
        std::cout << "SetParent attempt " << attempts << ": " << (res != NULL ? "Success" : "Failed") << std::endl;
    }

    if (res == NULL) {
        std::cerr << "Failed to set parent window" << std::endl;
        return false;
    }

    // 转换坐标
    POINT points[2] = {
        {bounds->left, bounds->top},
        {bounds->right, bounds->bottom}
    };
    MapWindowPoints(NULL, hWorkerW, points, 2);

    // 重新设置窗口位置和大小
    SetWindowPos(hwnd, NULL, 
                points[0].x, points[0].y,
                points[1].x - points[0].x, points[1].y - points[0].y,
                SWP_NOACTIVATE);
    
    return true;
}

// ==================== 窗口样式辅助函数 ====================

void WallpaperModule::AddWindowStyle(HWND hwnd, DWORD style) {
    LONG_PTR currentStyle = GetWindowLongPtrW(hwnd, GWL_STYLE);
    SetWindowLongPtrW(hwnd, GWL_STYLE, currentStyle | style);
    SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
        SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
}

void WallpaperModule::RemoveWindowStyle(HWND hwnd, DWORD style) {
    LONG_PTR currentStyle = GetWindowLongPtrW(hwnd, GWL_STYLE);
    SetWindowLongPtrW(hwnd, GWL_STYLE, currentStyle & ~style);
    SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
        SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
}

void WallpaperModule::AddExtendedStyle(HWND hwnd, DWORD exStyle) {
    LONG_PTR currentExStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, currentExStyle | exStyle);
    SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
        SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
}

void WallpaperModule::RemoveExtendedStyle(HWND hwnd, DWORD exStyle) {
    LONG_PTR currentExStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, currentExStyle & ~exStyle);
    SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
        SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
}

// ==================== 辅助函数 ====================

bool WallpaperModule::FileExists(const std::wstring& path) const {
    DWORD attrib = GetFileAttributesW(path.c_str());
    return (attrib != INVALID_FILE_ATTRIBUTES && !(attrib & FILE_ATTRIBUTE_DIRECTORY));
}

std::wstring WallpaperModule::StringToWString(const std::string& str) const {
    if (str.empty()) return std::wstring();
    
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
    std::wstring wstrTo(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstrTo[0], size_needed);
    return wstrTo;
}

void WallpaperModule::GetRealScreenResolution(int& width, int& height) {
    // 使用 EnumDisplaySettings 获取真实的物理分辨率
    DEVMODEW devMode;
    ZeroMemory(&devMode, sizeof(devMode));
    devMode.dmSize = sizeof(devMode);
    
    // 获取当前显示设置
    if (EnumDisplaySettingsW(NULL, ENUM_CURRENT_SETTINGS, &devMode)) {
        width = devMode.dmPelsWidth;
        height = devMode.dmPelsHeight;
        
        std::cout << "=== Physical Screen Resolution ===" << std::endl;
        std::cout << "Width x Height: " << width << "x" << height << std::endl;
        std::cout << "Refresh Rate: " << devMode.dmDisplayFrequency << " Hz" << std::endl;
        std::cout << "Color Depth: " << devMode.dmBitsPerPel << " bits" << std::endl;
    } else {
        // 备用方案
        width = GetSystemMetrics(SM_CXSCREEN);
        height = GetSystemMetrics(SM_CYSCREEN);
        std::cout << "Fallback resolution: " << width << "x" << height << std::endl;
    }
    
    // 获取 DPI 和逻辑像素信息用于对比
    HDC hdc = GetDC(NULL);
    if (hdc) {
        int dpiX = GetDeviceCaps(hdc, LOGPIXELSX);
        int dpiY = GetDeviceCaps(hdc, LOGPIXELSY);
        int logWidth = GetSystemMetrics(SM_CXSCREEN);
        int logHeight = GetSystemMetrics(SM_CYSCREEN);
        
        std::cout << "\n=== DPI Information ===" << std::endl;
        std::cout << "DPI: " << dpiX << "x" << dpiY << " (96 = 100%, 120 = 125%, 144 = 150%)" << std::endl;
        std::cout << "DPI Scale: " << (dpiX * 100 / 96) << "%" << std::endl;
        std::cout << "Logical Resolution: " << logWidth << "x" << logHeight << std::endl;
        std::cout << "Physical Resolution: " << width << "x" << height << std::endl;
        
        if (width != logWidth || height != logHeight) {
            std::cout << "\n⚠️ DPI Scaling is ACTIVE!" << std::endl;
            std::cout << "   Using physical resolution for video wallpaper." << std::endl;
        } else {
            std::cout << "\n✓ No DPI scaling (100%)" << std::endl;
        }
        
        ReleaseDC(NULL, hdc);
    }
    std::cout << "===================================" << std::endl;
}

