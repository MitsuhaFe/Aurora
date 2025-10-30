#include <windows.h>
#include <iostream>
#include <string>

// 方法1: 使用SystemParametersInfo (推荐)
bool SetWallpaperMethod1(const std::wstring& imagePath) {
    // SPIF_UPDATEINIFILE: 更新用户配置文件
    // SPIF_SENDCHANGE: 广播WM_SETTINGCHANGE消息
    BOOL result = SystemParametersInfoW(
        SPI_SETDESKWALLPAPER,
        0,
        (PVOID)imagePath.c_str(),
        SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
    );

    return result != 0;
}

// 方法2: 使用注册表方式
bool SetWallpaperMethod2(const std::wstring& imagePath) {
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

// 检查文件是否存在
bool FileExists(const std::wstring& path) {
    DWORD attrib = GetFileAttributesW(path.c_str());
    return (attrib != INVALID_FILE_ATTRIBUTES && !(attrib & FILE_ATTRIBUTE_DIRECTORY));
}

int main() {
    // 设置控制台支持中文
    SetConsoleOutputCP(CP_UTF8);

    // 壁纸图片路径
    std::wstring imagePath = L"D:\\Pictures\\pixiv\\illust_68422805_20220621_141610.jpg";

    std::wcout << L"正在设置壁纸..." << std::endl;
    std::wcout << L"图片路径: " << imagePath << std::endl;

    // 检查文件是否存在
    if (!FileExists(imagePath)) {
        std::wcout << L"错误: 图片文件不存在！" << std::endl;
        std::wcout << L"请检查路径是否正确。" << std::endl;
        system("pause");
        return 1;
    }

    // 使用方法1设置壁纸
    if (SetWallpaperMethod1(imagePath)) {
        std::wcout << L"✓ 壁纸设置成功！" << std::endl;
    } else {
        std::wcout << L"✗ 壁纸设置失败，尝试方法2..." << std::endl;

        // 如果方法1失败，尝试方法2
        if (SetWallpaperMethod2(imagePath)) {
            std::wcout << L"✓ 壁纸设置成功（使用方法2）！" << std::endl;
        } else {
            std::wcout << L"✗ 壁纸设置失败！" << std::endl;
            std::wcout << L"错误代码: " << GetLastError() << std::endl;
        }
    }

    system("pause");
    return 0;
}