#include "CommandHandler.h"
#include <iostream>

CommandHandler::CommandHandler() {
    // 初始化壁纸模块
    wallpaperModule = std::make_unique<WallpaperModule>();
}

CommandHandler::~CommandHandler() {
    // 清理资源
}

void CommandHandler::emitEvent(const json& event) {
    std::cout << event.dump() << std::endl;
    std::cout.flush();
}

void CommandHandler::emitError(const std::string& message, const std::string& details) {
    json errorEvent = {
        {"event", "error"},
        {"message", message},
        {"details", details}
    };
    emitEvent(errorEvent);
}

void CommandHandler::handleCommand(const json& cmd) {
    std::string action = cmd.value("action", "");

    if (action.empty()) {
        emitError("缺少 action 字段");
        return;
    }

    try {
        // ========== 壁纸相关命令 ==========
        if (action == "set_static_wallpaper") {
            // 设置静态壁纸
            std::string path = cmd.value("path", "");
            if (path.empty()) {
                emitError("缺少壁纸路径参数");
                return;
            }

            // 先停止任何正在运行的动态壁纸
            wallpaperModule->stopWallpaper();

            bool success = wallpaperModule->setStaticWallpaper(path);
            
            json response = {
                {"event", "wallpaper_changed"},
                {"type", "static"},
                {"success", success},
                {"path", path}
            };
            emitEvent(response);
        }
        else if (action == "set_dynamic_wallpaper") {
            // 设置动态壁纸（视频）
            std::string path = cmd.value("path", "");
            if (path.empty()) {
                emitError("缺少视频路径参数");
                return;
            }

            // 先停止之前的动态壁纸（如果有）
            wallpaperModule->stopWallpaper();

            bool success = wallpaperModule->setDynamicWallpaper(path);
            
            json response = {
                {"event", "wallpaper_changed"},
                {"type", "dynamic"},
                {"success", success},
                {"path", path}
            };
            emitEvent(response);
        }
        else if (action == "stop_wallpaper") {
            // 停止壁纸（用于动态壁纸）
            wallpaperModule->stopWallpaper();
            
            json response = {
                {"event", "wallpaper_stopped"},
                {"success", true}
            };
            emitEvent(response);
        }
        else if (action == "get_current_wallpaper") {
            // 获取当前壁纸信息
            std::string currentPath = wallpaperModule->getCurrentWallpaperPath();
            
            json response = {
                {"event", "current_wallpaper_info"},
                {"path", currentPath}
            };
            emitEvent(response);
        }
        // ========== 未知命令 ==========
        else {
            emitError("未知的命令", action);
        }

    } catch (const std::exception& e) {
        emitError("命令执行异常", e.what());
    }
}

