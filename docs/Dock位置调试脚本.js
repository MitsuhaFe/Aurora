/**
 * Dock 位置问题调试脚本
 * 
 * 使用方法：
 * 1. 打开浏览器控制台（F12）
 * 2. 复制整个脚本并粘贴到控制台
 * 3. 按回车运行
 * 4. 查看输出结果
 */

async function debugDockPosition() {
  console.log('='.repeat(60));
  console.log('🔍 Dock 位置问题诊断');
  console.log('='.repeat(60));
  console.log('');
  
  // ==================== 第 1 步：检查 localStorage ====================
  console.log('📦 第 1 步：检查 localStorage');
  console.log('-'.repeat(60));
  
  const STORAGE_KEY = 'aurora-dock-settings';
  const storedData = localStorage.getItem(STORAGE_KEY);
  
  if (!storedData) {
    console.log('❌ localStorage 中没有保存的设置');
    console.log('   这是正常的，如果是首次启动');
    console.log('   请拖动 Dock 并重新运行此脚本');
    return;
  }
  
  let parsed;
  try {
    parsed = JSON.parse(storedData);
    console.log('✅ localStorage 数据有效');
  } catch (error) {
    console.log('❌ localStorage 数据损坏:', error);
    return;
  }
  
  console.log('📍 localStorage 中的位置:', {
    x: parsed.x,
    y: parsed.y,
    是否为默认标记: parsed.x === -1 || parsed.y === -1
  });
  
  if (parsed.x === -1 || parsed.y === -1) {
    console.log('⚠️ 位置是默认标记（-1），这表示：');
    console.log('   1. 可能是首次启动');
    console.log('   2. 或者拖动后位置没有正确保存');
  }
  
  console.log('');
  
  // ==================== 第 2 步：检查 store ====================
  console.log('🏪 第 2 步：检查 Pinia Store');
  console.log('-'.repeat(60));
  
  let dockStore;
  try {
    dockStore = useDockStore();
    console.log('✅ 成功获取 dockStore');
  } catch (error) {
    console.log('❌ 无法获取 dockStore:', error);
    return;
  }
  
  console.log('📍 store 中的位置:', {
    x: dockStore.settings.x,
    y: dockStore.settings.y,
    是否为默认标记: dockStore.settings.x === -1 || dockStore.settings.y === -1
  });
  
  console.log('');
  
  // ==================== 第 3 步：对比数据 ====================
  console.log('⚖️  第 3 步：对比 localStorage 和 store');
  console.log('-'.repeat(60));
  
  const xMatch = parsed.x === dockStore.settings.x;
  const yMatch = parsed.y === dockStore.settings.y;
  
  if (xMatch && yMatch) {
    console.log('✅ localStorage 和 store 的位置完全一致');
  } else {
    console.log('❌ localStorage 和 store 的位置不一致！');
    console.log('   localStorage: { x: ' + parsed.x + ', y: ' + parsed.y + ' }');
    console.log('   store:        { x: ' + dockStore.settings.x + ', y: ' + dockStore.settings.y + ' }');
    console.log('');
    console.log('⚠️ 这表示：');
    console.log('   1. 加载设置时出现问题');
    console.log('   2. 或者加载后某处代码修改了位置');
  }
  
  console.log('');
  
  // ==================== 第 4 步：检查窗口 ====================
  console.log('🪟 第 4 步：检查 Dock 窗口');
  console.log('-'.repeat(60));
  
  if (!dockStore.dockWindow) {
    console.log('⚠️ Dock 窗口未创建');
    console.log('   请在设置中打开 Dock 并重新运行此脚本');
    console.log('');
    console.log('='.repeat(60));
    return;
  }
  
  console.log('✅ Dock 窗口已创建');
  
  let actualPosition;
  try {
    actualPosition = await dockStore.dockWindow.outerPosition();
    console.log('✅ 成功获取窗口位置');
    console.log('📍 窗口实际位置:', actualPosition);
  } catch (error) {
    console.log('❌ 无法获取窗口位置:', error);
    console.log('');
    console.log('='.repeat(60));
    return;
  }
  
  console.log('');
  
  // ==================== 第 5 步：对比期望和实际位置 ====================
  console.log('🎯 第 5 步：对比期望位置和实际位置');
  console.log('-'.repeat(60));
  
  const xDiff = Math.abs(actualPosition.x - dockStore.settings.x);
  const yDiff = Math.abs(actualPosition.y - dockStore.settings.y);
  
  console.log('期望位置:', { x: dockStore.settings.x, y: dockStore.settings.y });
  console.log('实际位置:', { x: actualPosition.x, y: actualPosition.y });
  console.log('位置误差:', { x: xDiff + 'px', y: yDiff + 'px' });
  
  if (xDiff < 10 && yDiff < 10) {
    console.log('✅ 位置匹配（误差 <10px）');
  } else if (xDiff < 50 && yDiff < 50) {
    console.log('⚠️ 位置接近但有偏差（误差 <50px）');
    console.log('   这可能是正常的窗口装饰或边框造成的');
  } else {
    console.log('❌ 位置严重不匹配！');
    console.log('');
    console.log('⚠️ 可能的原因：');
    console.log('   1. 创建窗口时使用了错误的位置');
    console.log('   2. Tauri 窗口坐标系统问题');
    console.log('   3. 多显示器配置问题');
  }
  
  console.log('');
  
  // ==================== 第 6 步：诊断结论 ====================
  console.log('📋 诊断结论');
  console.log('='.repeat(60));
  
  if (parsed.x === -1 || parsed.y === -1) {
    console.log('');
    console.log('🔴 问题：位置没有保存到 localStorage');
    console.log('');
    console.log('解决步骤：');
    console.log('1. 拖动 Dock 到新位置');
    console.log('2. 查看控制台是否有以下日志：');
    console.log('   - 🖱️ 开始拖动 Dock...');
    console.log('   - ✅ 拖动结束，保存位置...');
    console.log('   - 📍 保存 Dock 位置: { x: xxx, y: yyy }');
    console.log('   - 💾 保存设置到 localStorage: { ... }');
    console.log('3. 如果没有看到这些日志，说明拖动逻辑有问题');
    
  } else if (!xMatch || !yMatch) {
    console.log('');
    console.log('🟠 问题：localStorage 中有位置，但 store 中的位置不一致');
    console.log('');
    console.log('解决步骤：');
    console.log('1. 重启应用');
    console.log('2. 立即打开控制台（在 Dock 创建之前）');
    console.log('3. 查看是否有以下日志：');
    console.log('   - 📂 从 localStorage 加载设置: { 位置: { x: xxx, y: yyy }, ... }');
    console.log('   - ✅ Dock Store 已加载设置: { 位置: { x: xxx, y: yyy }, ... }');
    console.log('4. 检查加载的位置是否与 localStorage 中的一致');
    console.log('5. 如果不一致，可能是 loadSettings() 函数有问题');
    
  } else if (!dockStore.dockWindow) {
    console.log('');
    console.log('🟡 信息：Dock 窗口未创建，无法检查实际位置');
    console.log('');
    console.log('后续步骤：');
    console.log('1. 在设置中打开 Dock');
    console.log('2. 重新运行此脚本：debugDockPosition()');
    
  } else if (xDiff >= 50 || yDiff >= 50) {
    console.log('');
    console.log('🟠 问题：保存和加载都正常，但窗口出现在错误的位置');
    console.log('');
    console.log('解决步骤：');
    console.log('1. 检查控制台日志：');
    console.log('   - 🪟 [createDockWindow] 从 settings 读取的位置: { x: xxx, y: yyy }');
    console.log('   - ✅ [createDockWindow] 使用保存的位置: { x: xxx, y: yyy }');
    console.log('2. 如果显示"首次启动，计算默认位置"，说明创建窗口时位置被重置');
    console.log('3. 如果显示"使用保存的位置"，可能是 Tauri 坐标系统问题');
    console.log('4. 尝试在窗口创建后手动设置位置（已在代码中实现）');
    
  } else {
    console.log('');
    console.log('🟢 结论：所有检查都通过！');
    console.log('');
    console.log('✅ localStorage 中有位置数据');
    console.log('✅ store 中的位置与 localStorage 一致');
    console.log('✅ 窗口实际位置与设置一致（误差 <10px）');
    console.log('');
    console.log('Dock 位置功能工作正常！');
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('🔧 额外工具');
  console.log('='.repeat(60));
  console.log('');
  console.log('// 查看完整设置');
  console.log('console.log(useDockStore().settings);');
  console.log('');
  console.log('// 手动保存当前窗口位置');
  console.log('const pos = await useDockStore().dockWindow.outerPosition();');
  console.log('await useDockStore().savePosition(pos.x, pos.y);');
  console.log('');
  console.log('// 清除所有设置并重新开始');
  console.log('localStorage.clear(); location.reload();');
  console.log('');
  console.log('='.repeat(60));
}

// 自动运行
debugDockPosition();

