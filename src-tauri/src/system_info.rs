use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks, Networks};
use std::sync::Mutex;
use std::time::SystemTime;

/// 系统信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub cpu_name: String,
    pub memory_used: u64,
    pub memory_total: u64,
    pub memory_usage: f32,
}

/// 磁盘信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub used_space: u64,
    pub usage_percent: f32,
}

/// 网络信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    pub upload_speed: u64,      // 字节/秒
    pub download_speed: u64,    // 字节/秒
    pub total_uploaded: u64,    // 总上传字节
    pub total_downloaded: u64,  // 总下载字节
    pub ip_address: String,
}

/// 网络统计
struct NetworkStats {
    last_update: SystemTime,
    last_transmitted: u64,
    last_received: u64,
}

pub struct SystemMonitor {
    sys: Mutex<System>,
    networks: Mutex<Networks>,
    network_stats: Mutex<NetworkStats>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        
        let networks = Networks::new_with_refreshed_list();
        
        let network_stats = NetworkStats {
            last_update: SystemTime::now(),
            last_transmitted: 0,
            last_received: 0,
        };
        
        Self {
            sys: Mutex::new(sys),
            networks: Mutex::new(networks),
            network_stats: Mutex::new(network_stats),
        }
    }
    
    /// 获取系统信息
    pub fn get_system_info(&self) -> SystemInfo {
        let mut sys = self.sys.lock().unwrap();
        sys.refresh_cpu();
        sys.refresh_memory();
        
        // 获取 CPU 使用率（全局平均）
        let cpu_usage = sys.global_cpu_info().cpu_usage();
        
        // 获取 CPU 名称（从第一个 CPU 核心获取）
        let cpu_name = sys.cpus()
            .first()
            .map(|cpu| cpu.brand().trim().to_string())
            .unwrap_or_else(|| "Unknown CPU".to_string());
        
        // 获取内存信息
        let memory_total = sys.total_memory();
        let memory_used = sys.used_memory();
        let memory_usage = if memory_total > 0 {
            (memory_used as f32 / memory_total as f32) * 100.0
        } else {
            0.0
        };
        
        SystemInfo {
            cpu_usage,
            cpu_name,
            memory_used,
            memory_total,
            memory_usage,
        }
    }
    
    /// 获取磁盘信息
    pub fn get_disk_info(&self) -> Vec<DiskInfo> {
        let disks = Disks::new_with_refreshed_list();
        
        disks.iter().map(|disk| {
            let total_space = disk.total_space();
            let available_space = disk.available_space();
            let used_space = total_space - available_space;
            let usage_percent = if total_space > 0 {
                (used_space as f32 / total_space as f32) * 100.0
            } else {
                0.0
            };
            
            DiskInfo {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                total_space,
                available_space,
                used_space,
                usage_percent,
            }
        }).collect()
    }
    
    /// 获取网络信息
    pub fn get_network_info(&self) -> NetworkInfo {
        let mut networks = self.networks.lock().unwrap();
        let mut stats = self.network_stats.lock().unwrap();
        
        networks.refresh();
        
        let now = SystemTime::now();
        let time_diff = now.duration_since(stats.last_update)
            .unwrap_or(std::time::Duration::from_secs(1))
            .as_secs_f64();
        
        // 优先选择网络适配器：WiFi > 以太网 > 其他
        let selected_interface = Self::select_primary_network_interface(&networks);
        
        // 获取选定接口的流量数据
        let (total_transmitted, total_received) = if let Some((_, data)) = selected_interface {
            (data.total_transmitted(), data.total_received())
        } else {
            // 如果没有找到合适的接口，使用所有接口的总和（兜底方案）
            let mut total_tx = 0u64;
            let mut total_rx = 0u64;
            for (_, data) in networks.iter() {
                total_tx += data.total_transmitted();
                total_rx += data.total_received();
            }
            (total_tx, total_rx)
        };
        
        // 计算速度（字节/秒）
        let upload_speed = if time_diff > 0.0 && stats.last_transmitted > 0 {
            ((total_transmitted.saturating_sub(stats.last_transmitted)) as f64 / time_diff) as u64
        } else {
            0
        };
        
        let download_speed = if time_diff > 0.0 && stats.last_received > 0 {
            ((total_received.saturating_sub(stats.last_received)) as f64 / time_diff) as u64
        } else {
            0
        };
        
        // 更新统计
        stats.last_update = now;
        stats.last_transmitted = total_transmitted;
        stats.last_received = total_received;
        
        // 获取选中接口的 IP 地址
        let ip_address = if let Some((interface_name, _)) = selected_interface {
            Self::get_interface_ip_address(interface_name)
        } else {
            // 如果没有选中接口，使用默认方法
            match local_ip_address::local_ip() {
                Ok(ip) => ip.to_string(),
                Err(_) => "未知".to_string(),
            }
        };
        
        NetworkInfo {
            upload_speed,
            download_speed,
            total_uploaded: total_transmitted,
            total_downloaded: total_received,
            ip_address,
        }
    }
    
    /// 获取指定网络接口的 IP 地址
    fn get_interface_ip_address(interface_name: &str) -> String {
        // 使用 local_ip_address 库列出所有网络接口
        match local_ip_address::list_afinet_netifas() {
            Ok(network_interfaces) => {
                // 遍历所有接口，查找匹配的接口名称
                for (name, ip) in network_interfaces.iter() {
                    // 精确匹配或包含匹配（因为接口名称可能有细微差异）
                    if name == interface_name || name.contains(interface_name) || interface_name.contains(name) {
                        // 只返回 IPv4 地址（排除 IPv6）
                        if ip.is_ipv4() {
                            return ip.to_string();
                        }
                    }
                }
                
                // 如果没找到精确匹配，尝试模糊匹配（忽略大小写）
                let interface_lower = interface_name.to_lowercase();
                for (name, ip) in network_interfaces.iter() {
                    let name_lower = name.to_lowercase();
                    if name_lower.contains(&interface_lower) || interface_lower.contains(&name_lower) {
                        if ip.is_ipv4() {
                            return ip.to_string();
                        }
                    }
                }
                
                // 如果还是没找到，返回默认IP
                match local_ip_address::local_ip() {
                    Ok(ip) => ip.to_string(),
                    Err(_) => "未知".to_string(),
                }
            }
            Err(_) => {
                // 如果列出接口失败，使用默认方法
                match local_ip_address::local_ip() {
                    Ok(ip) => ip.to_string(),
                    Err(_) => "未知".to_string(),
                }
            }
        }
    }
    
    /// 选择主要网络接口（优先级：WiFi > 以太网 > 其他）
    fn select_primary_network_interface<'a>(
        networks: &'a Networks,
    ) -> Option<(&'a String, &'a sysinfo::NetworkData)> {
        let mut wifi_interface = None;
        let mut ethernet_interface = None;
        let mut fallback_interface = None;
        
        for (interface_name, data) in networks.iter() {
            let name_lower = interface_name.to_lowercase();
            
            // 检查是否为 WiFi 接口
            if name_lower.contains("wi-fi") 
                || name_lower.contains("wifi") 
                || name_lower.contains("wlan")
                || name_lower.contains("wireless")
                || name_lower.contains("802.11") {
                // 只选择有流量的接口
                if data.total_transmitted() > 0 || data.total_received() > 0 {
                    wifi_interface = Some((interface_name, data));
                }
            }
            // 检查是否为以太网接口
            else if name_lower.contains("ethernet") 
                || name_lower.contains("以太网")
                || name_lower.contains("eth")
                || name_lower.contains("lan") {
                // 只选择有流量的接口
                if data.total_transmitted() > 0 || data.total_received() > 0 {
                    if ethernet_interface.is_none() {
                        ethernet_interface = Some((interface_name, data));
                    }
                }
            }
            // 其他接口作为兜底
            else if (data.total_transmitted() > 0 || data.total_received() > 0) 
                && fallback_interface.is_none() 
                && !name_lower.contains("loopback")
                && !name_lower.contains("127.0.0.1")
                && !name_lower.contains("虚拟")
                && !name_lower.contains("virtual") {
                fallback_interface = Some((interface_name, data));
            }
        }
        
        // 按优先级返回
        wifi_interface
            .or(ethernet_interface)
            .or(fallback_interface)
    }
}

// Tauri 命令

#[tauri::command]
pub fn get_system_info(monitor: tauri::State<SystemMonitor>) -> Result<SystemInfo, String> {
    Ok(monitor.get_system_info())
}

#[tauri::command]
pub fn get_disk_info(monitor: tauri::State<SystemMonitor>) -> Result<Vec<DiskInfo>, String> {
    Ok(monitor.get_disk_info())
}

#[tauri::command]
pub fn get_network_info(monitor: tauri::State<SystemMonitor>) -> Result<NetworkInfo, String> {
    Ok(monitor.get_network_info())
}

