cmake_minimum_required(VERSION 3.20)
project(AuroraCore VERSION 0.1.0 LANGUAGES CXX)

# 设置 C++ 标准
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 设置输出目录
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# 为不同的配置设置输出目录
foreach(OUTPUTCONFIG ${CMAKE_CONFIGURATION_TYPES})
    string(TOUPPER ${OUTPUTCONFIG} OUTPUTCONFIG)
    set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_${OUTPUTCONFIG} ${CMAKE_BINARY_DIR}/bin/${OUTPUTCONFIG})
    set(CMAKE_LIBRARY_OUTPUT_DIRECTORY_${OUTPUTCONFIG} ${CMAKE_BINARY_DIR}/lib/${OUTPUTCONFIG})
    set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY_${OUTPUTCONFIG} ${CMAKE_BINARY_DIR}/lib/${OUTPUTCONFIG})
endforeach()

# Windows 特定设置
if(WIN32)
    # 添加 Windows 编译选项
    add_definitions(-DUNICODE -D_UNICODE)
    add_definitions(-DWIN32_LEAN_AND_MEAN)
    add_definitions(-DNOMINMAX)
    
    # 设置 Windows 子系统为控制台（区分 MSVC 和 MinGW）
    if(MSVC)
        set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} /SUBSYSTEM:CONSOLE")
        # 添加 Windows SDK 库（MSVC 风格）
        link_libraries(
            User32.lib
            Gdi32.lib
            Shell32.lib
            Ole32.lib
            Advapi32.lib
        )
    else()
        # MinGW/GCC 风格
        set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -mconsole")
        # 添加 Windows SDK 库（MinGW 风格）
        link_libraries(
            user32
            gdi32
            shell32
            ole32
            advapi32
        )
    endif()
endif()

# 添加 nlohmann/json（header-only 库）
set(JSON_BuildTests OFF CACHE INTERNAL "")
include(FetchContent)

FetchContent_Declare(json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

# 收集源文件
file(GLOB_RECURSE SOURCES 
    "src/*.cpp"
    "src/*.h"
)

# 创建可执行文件
add_executable(AuroraCore ${SOURCES})

# 包含目录
target_include_directories(AuroraCore PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# 链接 nlohmann/json
target_link_libraries(AuroraCore PRIVATE nlohmann_json::nlohmann_json)

# 设置编译选项
if(MSVC)
    # MSVC 特定选项
    target_compile_options(AuroraCore PRIVATE /W4 /utf-8)
    # 优化选项
    if(CMAKE_BUILD_TYPE MATCHES Release)
        target_compile_options(AuroraCore PRIVATE /O2)
    endif()
else()
    # GCC/Clang 选项
    target_compile_options(AuroraCore PRIVATE -Wall -Wextra)
    if(CMAKE_BUILD_TYPE MATCHES Release)
        target_compile_options(AuroraCore PRIVATE -O3)
    endif()
endif()

# 安装规则
install(TARGETS AuroraCore DESTINATION bin)

# 打印配置信息
message(STATUS "=== Aurora Core Configuration ===")
message(STATUS "Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "Output Directory: ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}")
message(STATUS "================================")

