// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod system_info;

use serde::{Deserialize, Serialize};
use system_info::SystemMonitor;

#[derive(Debug, Serialize, Deserialize)]
struct IconResult {
    success: bool,
    icon: Option<String>,
    error: Option<String>,
}

#[cfg(windows)]
#[tauri::command]
fn extract_icon(exe_path: String) -> IconResult {
    use std::ptr::null_mut;
    use winapi::um::shellapi::ExtractIconW;
    use winapi::um::wingdi::{CreateCompatibleDC, CreateCompatibleBitmap, SelectObject, GetObjectW, BITMAP, DeleteObject, GetDIBits, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS};
    use winapi::um::winuser::{GetDC, ReleaseDC, DrawIconEx, DestroyIcon, GetIconInfo, ICONINFO};
    use std::os::windows::ffi::OsStrExt;
    use std::ffi::OsStr;
    
    // DI_NORMAL 常量定义
    const DI_NORMAL: u32 = 0x0003;

    // 将路径转换为宽字符
    let wide: Vec<u16> = OsStr::new(&exe_path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        // 提取图标（大图标）
        let hicon = ExtractIconW(null_mut(), wide.as_ptr(), 0);
        
        if hicon.is_null() || hicon as usize == 1 {
            return IconResult {
                success: false,
                icon: None,
                error: Some("无法提取图标".to_string()),
            };
        }

        // 获取图标信息
        let mut icon_info: ICONINFO = std::mem::zeroed();
        if GetIconInfo(hicon, &mut icon_info) == 0 {
            DestroyIcon(hicon);
            return IconResult {
                success: false,
                icon: None,
                error: Some("无法获取图标信息".to_string()),
            };
        }

        // 获取位图信息
        let mut bitmap: BITMAP = std::mem::zeroed();
        if GetObjectW(
            icon_info.hbmColor as *mut _,
            std::mem::size_of::<BITMAP>() as i32,
            &mut bitmap as *mut _ as *mut _,
        ) == 0
        {
            DeleteObject(icon_info.hbmColor as *mut _);
            DeleteObject(icon_info.hbmMask as *mut _);
            DestroyIcon(hicon);
            return IconResult {
                success: false,
                icon: None,
                error: Some("无法获取位图信息".to_string()),
            };
        }

        let _width = bitmap.bmWidth;   // 保留用于调试
        let _height = bitmap.bmHeight; // 保留用于调试
        
        // 提取更高分辨率的图标以保证清晰度
        // 128x128 在高 DPI 显示器上也能保持清晰
        let icon_size = 128;
        
        // 创建设备上下文
        let hdc_screen = GetDC(null_mut());
        let hdc_mem = CreateCompatibleDC(hdc_screen);
        let hbm = CreateCompatibleBitmap(hdc_screen, icon_size, icon_size);
        let old_bm = SelectObject(hdc_mem, hbm as *mut _);

        // 绘制图标到位图
        DrawIconEx(
            hdc_mem,
            0,
            0,
            hicon,
            icon_size,
            icon_size,
            0,
            null_mut(),
            DI_NORMAL,
        );

        // 准备 BITMAPINFO
        let mut bmi: BITMAPINFO = std::mem::zeroed();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = icon_size;
        bmi.bmiHeader.biHeight = -icon_size; // 负值表示自上而下
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB;

        // 分配缓冲区
        let buffer_size = (icon_size * icon_size * 4) as usize;
        let mut buffer: Vec<u8> = vec![0; buffer_size];

        // 获取位图数据
        if GetDIBits(
            hdc_mem,
            hbm,
            0,
            icon_size as u32,
            buffer.as_mut_ptr() as *mut _,
            &mut bmi,
            DIB_RGB_COLORS,
        ) == 0
        {
            SelectObject(hdc_mem, old_bm);
            DeleteObject(hbm as *mut _);
            DeleteObject(hdc_mem as *mut _);
            ReleaseDC(null_mut(), hdc_screen);
            DeleteObject(icon_info.hbmColor as *mut _);
            DeleteObject(icon_info.hbmMask as *mut _);
            DestroyIcon(hicon);
            return IconResult {
                success: false,
                icon: None,
                error: Some("无法读取位图数据".to_string()),
            };
        }

        // 转换 BGRA 为 RGBA 并生成 PNG
        for i in (0..buffer.len()).step_by(4) {
            buffer.swap(i, i + 2); // 交换 B 和 R
        }

        // 将原始数据编码为 PNG
        let png_data = match encode_rgba_to_png(&buffer, icon_size as u32, icon_size as u32) {
            Ok(data) => data,
            Err(e) => {
                SelectObject(hdc_mem, old_bm);
                DeleteObject(hbm as *mut _);
                DeleteObject(hdc_mem as *mut _);
                ReleaseDC(null_mut(), hdc_screen);
                DeleteObject(icon_info.hbmColor as *mut _);
                DeleteObject(icon_info.hbmMask as *mut _);
                DestroyIcon(hicon);
                return IconResult {
                    success: false,
                    icon: None,
                    error: Some(format!("PNG 编码失败: {}", e)),
                };
            }
        };

        // 清理资源
        SelectObject(hdc_mem, old_bm);
        DeleteObject(hbm as *mut _);
        DeleteObject(hdc_mem as *mut _);
        ReleaseDC(null_mut(), hdc_screen);
        DeleteObject(icon_info.hbmColor as *mut _);
        DeleteObject(icon_info.hbmMask as *mut _);
        DestroyIcon(hicon);

        // 转换为 base64
        use base64::{Engine as _, engine::general_purpose};
        let base64_icon = general_purpose::STANDARD.encode(&png_data);

        IconResult {
            success: true,
            icon: Some(base64_icon),
            error: None,
        }
    }
}

#[cfg(windows)]
fn encode_rgba_to_png(rgba_data: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
    use flate2::write::ZlibEncoder;
    use flate2::Compression;
    use std::io::Write;
    
    // 简单的 PNG 编码（使用最基本的方法）
    let mut png_data = Vec::new();
    
    // PNG 文件头
    png_data.extend_from_slice(&[137, 80, 78, 71, 13, 10, 26, 10]);
    
    // IHDR chunk
    let mut ihdr = Vec::new();
    ihdr.extend_from_slice(b"IHDR");
    ihdr.extend_from_slice(&width.to_be_bytes());
    ihdr.extend_from_slice(&height.to_be_bytes());
    ihdr.push(8); // bit depth
    ihdr.push(6); // color type (RGBA)
    ihdr.push(0); // compression
    ihdr.push(0); // filter
    ihdr.push(0); // interlace
    
    write_chunk(&mut png_data, &ihdr);
    
    // IDAT chunk (未压缩数据，使用 deflate)
    let mut idat_data = Vec::new();
    idat_data.extend_from_slice(b"IDAT");
    
    // 使用 flate2 压缩数据
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    
    for y in 0..height {
        encoder.write_all(&[0]).map_err(|e| e.to_string())?; // filter type
        let row_start = (y * width * 4) as usize;
        let row_end = row_start + (width * 4) as usize;
        encoder.write_all(&rgba_data[row_start..row_end]).map_err(|e| e.to_string())?;
    }
    
    let compressed = encoder.finish().map_err(|e| e.to_string())?;
    idat_data.extend_from_slice(&compressed);
    
    write_chunk(&mut png_data, &idat_data);
    
    // IEND chunk
    write_chunk(&mut png_data, b"IEND");
    
    Ok(png_data)
}

#[cfg(windows)]
fn write_chunk(png_data: &mut Vec<u8>, chunk_data: &[u8]) {
    let chunk_type_and_data = if chunk_data.len() >= 4 && &chunk_data[0..4] != b"IEND" {
        chunk_data
    } else {
        chunk_data
    };
    
    let data_len = if chunk_type_and_data.len() > 4 {
        (chunk_type_and_data.len() - 4) as u32
    } else {
        0
    };
    
    png_data.extend_from_slice(&data_len.to_be_bytes());
    png_data.extend_from_slice(chunk_type_and_data);
    
    // CRC
    let crc = crc32(chunk_type_and_data);
    png_data.extend_from_slice(&crc.to_be_bytes());
}

#[cfg(windows)]
fn crc32(data: &[u8]) -> u32 {
    let mut crc = 0xffffffffu32;
    for &byte in data {
        crc ^= byte as u32;
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xedb88320;
            } else {
                crc >>= 1;
            }
        }
    }
    !crc
}

#[cfg(not(windows))]
#[tauri::command]
fn extract_icon(_exe_path: String) -> IconResult {
    IconResult {
        success: false,
        icon: None,
        error: Some("图标提取仅在 Windows 上支持".to_string()),
    }
}

// 获取全局鼠标位置
#[derive(Debug, Serialize, Deserialize)]
struct CursorPosition {
    x: f64,
    y: f64,
}

#[cfg(windows)]
#[tauri::command]
fn get_cursor_position() -> Result<CursorPosition, String> {
    use winapi::um::winuser::GetCursorPos;
    use winapi::shared::windef::POINT;
    
    unsafe {
        let mut point: POINT = std::mem::zeroed();
        if GetCursorPos(&mut point) != 0 {
            Ok(CursorPosition {
                x: point.x as f64,
                y: point.y as f64,
            })
        } else {
            Err("无法获取鼠标位置".to_string())
        }
    }
}

#[cfg(not(windows))]
#[tauri::command]
fn get_cursor_position() -> Result<CursorPosition, String> {
    Err("仅支持 Windows".to_string())
}

// 获取所有窗口信息
#[derive(Debug, Serialize, Deserialize, Clone)]
struct WindowInfo {
    hwnd: usize,
    title: String,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    is_visible: bool,
}

#[cfg(windows)]
#[tauri::command]
fn get_all_windows() -> Result<Vec<WindowInfo>, String> {
    use winapi::um::winuser::{EnumWindows, GetWindowTextW, GetWindowRect, IsWindowVisible};
    use winapi::shared::windef::{HWND, RECT};
    use std::mem;
    
    unsafe {
        // 用于存储窗口信息的静态变量
        static mut WINDOWS: Vec<WindowInfo> = Vec::new();
        
        // 枚举回调函数
        unsafe extern "system" fn enum_callback(hwnd: HWND, _lparam: isize) -> i32 {
            // 检查窗口是否可见
            if IsWindowVisible(hwnd) == 0 {
                return 1; // 继续枚举
            }
            
            // 获取窗口标题
            let mut title_buffer: [u16; 256] = [0; 256];
            let title_len = GetWindowTextW(hwnd, title_buffer.as_mut_ptr(), 256);
            
            // 如果没有标题，跳过（通常是系统窗口）
            if title_len == 0 {
                return 1;
            }
            
            let title = String::from_utf16_lossy(&title_buffer[..title_len as usize]);
            
            // 跳过特定的窗口
            if title.is_empty() 
                || title == "Program Manager" 
                || title == "Settings"
                || title.contains("桌面伙伴") 
                || title.contains("Aurora") {
                return 1;
            }
            
            // 获取窗口矩形
            let mut rect: RECT = mem::zeroed();
            if GetWindowRect(hwnd, &mut rect) == 0 {
                return 1;
            }
            
            let width = rect.right - rect.left;
            let height = rect.bottom - rect.top;
            
            // 过滤掉太小的窗口（可能是托盘图标等）
            if width < 100 || height < 100 {
                return 1;
            }
            
            // 添加到列表
            WINDOWS.push(WindowInfo {
                hwnd: hwnd as usize,
                title,
                x: rect.left,
                y: rect.top,
                width,
                height,
                is_visible: true,
            });
            
            1 // 继续枚举
        }
        
        // 清空之前的数据
        WINDOWS.clear();
        
        // 枚举所有窗口
        if EnumWindows(Some(enum_callback), 0) == 0 {
            return Err("枚举窗口失败".to_string());
        }
        
        // 返回结果
        Ok(WINDOWS.clone())
    }
}

#[cfg(not(windows))]
#[tauri::command]
fn get_all_windows() -> Result<Vec<WindowInfo>, String> {
    Err("仅支持 Windows".to_string())
}

// 任务栏信息结构
#[derive(Debug, Serialize, Deserialize)]
struct TaskbarInfo {
    position: String, // "top", "bottom", "left", "right"
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

#[cfg(windows)]
#[tauri::command]
fn get_taskbar_info() -> Result<Option<TaskbarInfo>, String> {
    use winapi::um::winuser::{FindWindowW, GetWindowRect, GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
    use winapi::shared::windef::RECT;
    
    unsafe {
        // 查找任务栏窗口（类名：Shell_TrayWnd）
        let taskbar_class: Vec<u16> = "Shell_TrayWnd\0".encode_utf16().collect();
        let hwnd = FindWindowW(taskbar_class.as_ptr(), std::ptr::null());
        
        if hwnd.is_null() {
            return Ok(None);
        }
        
        // 获取任务栏窗口位置
        let mut rect: RECT = std::mem::zeroed();
        if GetWindowRect(hwnd, &mut rect) == 0 {
            return Ok(None);
        }
        
        let taskbar_width = rect.right - rect.left;
        let taskbar_height = rect.bottom - rect.top;
        
        // 获取屏幕尺寸
        let screen_width = GetSystemMetrics(SM_CXSCREEN);
        let screen_height = GetSystemMetrics(SM_CYSCREEN);
        
        // 判断任务栏位置
        let position = if rect.top == 0 && taskbar_height < screen_height / 2 {
            // 任务栏在顶部
            "top"
        } else if rect.bottom == screen_height && taskbar_height < screen_height / 2 {
            // 任务栏在底部
            "bottom"
        } else if rect.left == 0 && taskbar_width < screen_width / 2 {
            // 任务栏在左侧
            "left"
        } else if rect.right == screen_width && taskbar_width < screen_width / 2 {
            // 任务栏在右侧
            "right"
        } else {
            // 默认假设在底部
            "bottom"
        };
        
        Ok(Some(TaskbarInfo {
            position: position.to_string(),
            x: rect.left,
            y: rect.top,
            width: taskbar_width,
            height: taskbar_height,
        }))
    }
}

#[cfg(not(windows))]
#[tauri::command]
fn get_taskbar_info() -> Result<Option<TaskbarInfo>, String> {
    Err("仅支持 Windows".to_string())
}

fn main() {
    let system_monitor = SystemMonitor::new();
    
    tauri::Builder::default()
        .manage(system_monitor)
        .invoke_handler(tauri::generate_handler![
            extract_icon,
            get_cursor_position,
            get_all_windows,
            get_taskbar_info,
            system_info::get_system_info,
            system_info::get_disk_info,
            system_info::get_network_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
