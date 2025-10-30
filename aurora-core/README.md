# Aurora Core - C++ 后端

这是 Aurora 的 C++ 后端核心模块，负责系统级操作。

## 目录结构

```
aurora-core/
├── CMakeLists.txt          # CMake 配置文件
├── src/                    # 源代码
│   ├── main.cpp           # 入口文件
│   ├── command_handler.cpp
│   ├── modules/           # 功能模块
│   └── utils/             # 工具函数
├── include/               # 第三方库头文件
└── lib/                   # 第三方库文件
```

## 编译

### Windows

```bash
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release
```

### macOS / Linux

```bash
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make
```

## 依赖

- nlohmann/json
- cpr (libcurl wrapper)
- libmpv (视频播放)
- WebView2 SDK (Windows, 网页渲染)

详见主开发文档。

