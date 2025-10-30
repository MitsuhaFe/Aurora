#include <windows.h>
#include <stdio.h>
#include <shlobj.h>
#include <string>
#include <iostream>

// 日志记录函数
void LogInfo(const char* message) {
    std::cout << "[INFO] " << message << std::endl;
}

// 桌面帮助类
class DeskTopHelper {
public:
    // 刷新桌面，清除残影
    static void Refresh() {
        SystemParametersInfo(SPI_SETDESKWALLPAPER, 0, NULL, SPIF_UPDATEINIFILE);
    }

    // 创建WorkerW窗口
    static void CreateWorkerW() {
        HWND hProgman = FindWindow(L"Progman", NULL);
        if (hProgman == NULL) return;
        // 发送特殊消息创建WorkerW
        SendMessageTimeout(hProgman, 0x052C, 0xD, 0x1, SMTO_NORMAL, 1000, NULL);
    }

    // 获取WorkerW窗口句柄
    static HWND GetWorkerW() {
        HWND hWorkerW = NULL;
        CreateWorkerW();
        // 枚举窗口回调函数
        EnumWindows([](HWND tophandle, LPARAM topparamhandle) -> BOOL {
            HWND shelldll_defview = FindWindowEx(tophandle, NULL, L"SHELLDLL_DefView", NULL);
            
            if (shelldll_defview != NULL) {
                wchar_t className[256] = {0};
                GetClassName(tophandle, className, 256);
                if (wcscmp(className, L"WorkerW") != 0) {
                    return TRUE;
                }
                // 找到WorkerW窗口
                HWND* hWorkerW = (HWND*)topparamhandle;
                *hWorkerW = FindWindowEx(NULL, tophandle, L"WorkerW", NULL);
                return FALSE;
            }
            return TRUE;
        }, (LPARAM)&hWorkerW);
        // 如果没找到，尝试在Progman下查找
        if (hWorkerW == NULL) {
            HWND hProgman = FindWindow(L"Progman", NULL);
            if (hProgman != NULL) {
                hWorkerW = FindWindowEx(hProgman, NULL, L"WorkerW", NULL);
            }
        }
        return hWorkerW;
    }

    // 将窗口设置为桌面背景
    static bool SendHandleToDesktopBottom(HWND hwnd, RECT* bounds) {
        if (hwnd == NULL || bounds == NULL) return false;

        HWND hWorkerW = GetWorkerW();
        if (hWorkerW == NULL) return false;

        // 设置窗口样式
        AddWindowStyle(hwnd, WS_CHILDWINDOW);
        RemoveWindowStyle(hwnd, WS_POPUP);
        AddExtendedStyle(hwnd, WS_EX_CONTROLPARENT);
        AddExtendedStyle(hwnd, WS_EX_LAYERED);
        AddExtendedStyle(hwnd, WS_EX_NOACTIVATE);
        AddExtendedStyle(hwnd, WS_EX_NOREDIRECTIONBITMAP);
        AddExtendedStyle(hwnd, WS_EX_TOOLWINDOW);
        RemoveExtendedStyle(hwnd, WS_EX_ACCEPTFILES);

        //刷新以便与更新窗口样式
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
            char log[256];
            sprintf_s(log, "SendHandleToDesktopBottom hwnd:%p worker:%p SetParentRes:%p attempts:%d", 
                     hwnd, hWorkerW, res, attempts);
            LogInfo(log);
        }

        // 转换坐标
        POINT points[2] = {
            {bounds->left, bounds->top},
            {bounds->right, bounds->bottom}
        };
        MapWindowPoints(NULL, hWorkerW, points, 2);

        // 重新设置窗口位置和大小
        RECT tmpBounds = {
            points[0].x,
            points[0].y,
            points[1].x - points[0].x,
            points[1].y - points[0].y
        };
        
        SetWindowPos(hwnd, NULL, 
                    tmpBounds.left, tmpBounds.top,
                    tmpBounds.right, tmpBounds.bottom,
                    SWP_NOACTIVATE);
        return true;
    }

private:
    static void AddWindowStyle(HWND hwnd, DWORD style)
    {
        std::cout <<"hwnd:" << hwnd << std::endl;
		std::cout << "style" << style << std::endl;
        LONG_PTR currentStyle = GetWindowLongPtr(hwnd, GWL_STYLE);
        
        
        SetWindowLongPtr(hwnd, GWL_STYLE, currentStyle | style);
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    }

    static void RemoveWindowStyle(HWND hwnd, DWORD style)
    {
        LONG_PTR currentStyle = GetWindowLongPtr(hwnd, GWL_STYLE);
        SetWindowLongPtr(hwnd, GWL_STYLE, currentStyle & ~style);
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    }

    static void AddExtendedStyle(HWND hwnd, DWORD exStyle)
    {
        LONG_PTR currentExStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE);
        SetWindowLongPtr(hwnd, GWL_EXSTYLE, currentExStyle | exStyle);
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    }

    static void RemoveExtendedStyle(HWND hwnd, DWORD exStyle)
    {
        LONG_PTR currentExStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE);
        SetWindowLongPtr(hwnd, GWL_EXSTYLE, currentExStyle & ~exStyle);
        SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    }

};




int main() {
	LPCWSTR lpParameter = L"ffplay.exe D:\\CodeProject\\C++\\Spy++\\Spy++\\video.mp4  -noborder -x 2560 -y 1440  -loop 0";
	STARTUPINFO si{ 0 };
	PROCESS_INFORMATION pi{ 0 };
	si.cb = sizeof(STARTUPINFO);  // 初始化STARTUPINFO结构体

	if (CreateProcess(L"D:\\CodeProject\\C++\\Spy++\\Spy++\\ffmpeg\\bin\\ffplay.exe", (LPWSTR)lpParameter, 0, 0, 0, 0, 0, 0, &si, &pi))
	{
        printf("ffplay进程已创建，进程ID: %d\n", pi.dwProcessId);
		Sleep(1000);												// 增加等待时间到1秒

        // 尝试查找播放窗口
		HWND hFfplay = NULL;
		for (int i = 0; i < 5; i++) {  // 尝试5次
			hFfplay = FindWindow(L"SDL_app", 0);
			if (hFfplay != NULL) {
				printf("找到SDL_app窗口\n");
				break;
			}
			Sleep(200);  // 每次尝试间隔200ms
		}
		if (hFfplay == NULL) {
			// 如果找不到SDL_app，尝试其他可能的类名
			hFfplay = FindWindow(L"SDL_Window", 0);
			if (hFfplay != NULL) {
				printf("找到SDL_Window窗口\n");
			}
		}

        HWND testWindow = GetDesktopWindow(); // 这里应该替换为实际的窗口句柄
        RECT bounds = {0, 0, 2560, 1440};      // 示例边界
    
        // 刷新桌面
         DeskTopHelper::Refresh();
    
        // 将窗口设置为桌面背景
        if (DeskTopHelper::SendHandleToDesktopBottom(hFfplay, &bounds)) {
            LogInfo("Successfully set window as desktop background");
        } else {
            LogInfo("Failed to set window as desktop background");
        }
        /*SetWindowLongPtr(hFfplay, GWL_STYLE, 107374182);
        std::cout << "now style!!!" << GetWindowLongPtr(hFfplay, GWL_STYLE) << std::endl << std::endl;*/
    }

    
    return 0;
}



//long newStyle = currentStyle | style;
//std::cout << "currentStyle | style: " << newStyle << std::endl;
//std::cout << "currentStyle: " << currentStyle << std::endl;
//std::cout << "style: " << style << std::endl;
//      int ai = 2248278016;
//      int bi = 1073741824;
      //int ci = ai | bi;
//      long al = 86020000;
//      long bl = 40000000;
      //long cl = al | bl;
      //std::cout << "ai" << ai << std::endl;
//      std::cout << "bi" << bi << std::endl;
//      std::cout <<"ai|bi=ci" << ci <<std::endl;
//      std::cout << "al" << al << std::endl;
//      std::cout << "bl" << bl << std::endl;
//      std::cout << "al|bl=cl" << cl << std::endl;