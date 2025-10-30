#ifndef COMMAND_HANDLER_H
#define COMMAND_HANDLER_H

#include <string>
#include <memory>
#include "nlohmann/json.hpp"
#include "modules/WallpaperModule.h"

using json = nlohmann::json;

/**
 * 命令处理器
 * 负责解析来自前端的 JSON 命令并分发到相应的模块
 */
class CommandHandler {
public:
    CommandHandler();
    ~CommandHandler();

    // 处理命令
    void handleCommand(const json& cmd);

private:
    // 壁纸模块
    std::unique_ptr<WallpaperModule> wallpaperModule;

    // 辅助函数
    void emitEvent(const json& event);
    void emitError(const std::string& message, const std::string& details = "");
};

#endif // COMMAND_HANDLER_H

