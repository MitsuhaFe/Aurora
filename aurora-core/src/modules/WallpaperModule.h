#ifndef WALLPAPER_MODULE_H
#define WALLPAPER_MODULE_H

#include <string>
#include <windows.h>

/**
 * 壁纸模块
 * 负责设置静态壁纸和动态壁纸（视频）
 */
class WallpaperModule {
public:
    WallpaperModule();
    ~WallpaperModule();

    // 设置静态壁纸
    bool setStaticWallpaper(const std::string& imagePath);

    // 设置动态壁纸（视频）
    bool setDynamicWallpaper(const std::string& videoPath);

    // 停止动态壁纸
    void stopWallpaper();

    // 获取当前壁纸路径
    std::string getCurrentWallpaperPath() const;

private:
    // 静态壁纸相关
    bool setStaticWallpaperMethod1(const std::wstring& imagePath);
    bool setStaticWallpaperMethod2(const std::wstring& imagePath);
    
    // 动态壁纸相关
    HWND videoWindow;
    PROCESS_INFORMATION videoProcess;
    bool isVideoPlaying;

    // WorkerW 窗口相关
    static HWND GetWorkerW();
    static void CreateWorkerW();
    bool SendHandleToDesktopBottom(HWND hwnd, RECT* bounds);

    // 窗口样式辅助函数
    static void AddWindowStyle(HWND hwnd, DWORD style);
    static void RemoveWindowStyle(HWND hwnd, DWORD style);
    static void AddExtendedStyle(HWND hwnd, DWORD exStyle);
    static void RemoveExtendedStyle(HWND hwnd, DWORD exStyle);

    // 辅助函数
    bool FileExists(const std::wstring& path) const;
    std::wstring StringToWString(const std::string& str) const;
    void GetRealScreenResolution(int& width, int& height);
    
    // 当前壁纸路径
    std::string currentWallpaperPath;
};

#endif // WALLPAPER_MODULE_H

