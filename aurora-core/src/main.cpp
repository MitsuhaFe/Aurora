#include <iostream>
#include <string>
#include <sstream>
#include <memory>
#include "nlohmann/json.hpp"
#include "CommandHandler.h"

using json = nlohmann::json;

// 向前端发送事件（通过 stdout）
void emitEvent(const json& eventPayload) {
    try {
        std::cout << eventPayload.dump() << std::endl;
        std::cout.flush();
    } catch (const std::exception& e) {
        std::cerr << "Error emitting event: " << e.what() << std::endl;
    }
}

// 错误处理函数
void handleError(const std::string& message, const std::string& details = "") {
    json errorEvent = {
        {"event", "error"},
        {"message", message},
        {"details", details}
    };
    emitEvent(errorEvent);
}

int main(int argc, char* argv[]) {
    // 设置控制台为 UTF-8 编码
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
    setvbuf(stdout, nullptr, _IONBF, 0); // 关闭 stdout 缓冲
    setvbuf(stderr, nullptr, _IONBF, 0); // 关闭 stderr 缓冲
#endif

    try {
        // 创建命令处理器
        auto handler = std::make_unique<CommandHandler>();
        
        // 发送就绪事件
        json readyEvent = {
            {"event", "core_ready"},
            {"version", "0.1.0"},
            {"timestamp", std::time(nullptr)}
        };
        emitEvent(readyEvent);

        // 主循环：从 stdin 读取命令
        std::string line;
        while (std::getline(std::cin, line)) {
            // 跳过空行
            if (line.empty()) {
                continue;
            }

            try {
                // 解析 JSON 命令
                json cmd = json::parse(line);
                
                // 处理命令
                handler->handleCommand(cmd);
                
            } catch (const json::parse_error& e) {
                handleError("JSON 解析错误", e.what());
            } catch (const std::exception& e) {
                handleError("命令处理错误", e.what());
            }
        }
        
    } catch (const std::exception& e) {
        handleError("程序初始化错误", e.what());
        return 1;
    }

    return 0;
}

