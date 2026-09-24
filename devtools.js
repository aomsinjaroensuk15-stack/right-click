/**
 * Mobile DevTools - ULTIMATE EDITION
 * Version: 2.0.0
 * GitHub: https://github.com/aomsinjaroensuk15-stack/right-click
 * 
 * A feature-packed F12 alternative for mobile Chrome.
 * 
 * Features:
 * ✅ Multi-Tab Interface (Console, Elements, Network, Storage, Performance)
 * ✅ Console with log/error/warn/info interception
 * ✅ Interactive JavaScript execution
 * ✅ DOM Inspector with live HTML editing
 * ✅ Network Monitor with XHR/Fetch interception
 * ✅ Cookie/LocalStorage/SessionStorage viewer & editor
 * ✅ Performance monitoring (FPS, Memory, Load Time)
 * ✅ CSS Live Editor
 * ✅ Event Listener Inspector
 * ✅ Touch-based (long-press) and Ctrl+Right-click activation
 * ✅ Responsive design with drag-to-resize
 * ✅ Export logs & network data
 */

(function() {
  'use strict';
  
  // ===========================
  // DUPLICATE INJECTION GUARD
  // ===========================
  
  if (window.MobileDevToolsInjected) {
    console.warn('[Mobile DevTools] Already injected');
    const existingPanel = document.getElementById('mobile-devtools-panel');
    if (existingPanel) {
      existingPanel.style.display = 'flex';
    }
    return;
  }
  
  window.MobileDevToolsInjected = true;
  
  // ===========================
  // STATE MANAGEMENT
  // ===========================
  
  const state = {
    currentTab: 'console',
    logs: [],
    networkRequests: [],
    selectedElement: null,
    performanceMetrics: {
      fps: 0,
      memory: 0,
      loadTime: 0
    },
    consoleHistory: [],
    historyIndex: -1
  };
  
  // ===========================
  // UTILITY FUNCTIONS
  // ===========================
  
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  function formatTime(ms) {
    if (ms < 1000) return ms.toFixed(0) + 'ms';
    return (ms / 1000).toFixed(2) + 's';
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function getElementPath(element) {
    if (!element || element === document.body) return 'body';
    
    const path = [];
    while (element && element !== document.body) {
      let selector = element.tagName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
        path.unshift(selector);
        break;
      } else if (element.className) {
        selector += '.' + element.className.trim().split(/\s+/).join('.');
      }
      
      let sibling = element;
      let nth = 1;
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling;
        if (sibling.tagName === element.tagName) nth++;
      }
      if (nth > 1) selector += `:nth-of-type(${nth})`;
      
      path.unshift(selector);
      element = element.parentElement;
    }
    return path.join(' > ');
  }
  
  // ===========================
  // UI CONSTRUCTION
  // ===========================
  
  function createDevToolsPanel() {
    const panel = document.createElement('div');
    panel.id = 'mobile-devtools-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60vh;
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;
      font-size: 11px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      border-top: 2px solid #007acc;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.6);
      transition: height 0.3s ease;
    `;
    
    return panel;
  }
  
  function createTopBar(panel) {
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      background: #2d2d30;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #3e3e42;
      user-select: none;
      cursor: ns-resize;
    `;
    
    // Drag to resize functionality
    let isDragging = false;
    let startY = 0;
    let startHeight = 0;
    
    topBar.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startHeight = parseInt(panel.style.height);
      document.body.style.userSelect = 'none';
    });
    
    topBar.addEventListener('touchstart', (e) => {
      isDragging = true;
      startY = e.touches[0].clientY;
      startHeight = parseInt(panel.style.height);
    }, { passive: true });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaY = startY - e.clientY;
      const newHeight = Math.min(95, Math.max(20, startHeight + (deltaY / window.innerHeight * 100)));
      panel.style.height = newHeight + 'vh';
    });
    
    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const deltaY = startY - e.touches[0].clientY;
      const newHeight = Math.min(95, Math.max(20, startHeight + (deltaY / window.innerHeight * 100)));
      panel.style.height = newHeight + 'vh';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });
    
    document.addEventListener('touchend', () => {
      isDragging = false;
    });
    
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    
    const title = document.createElement('span');
    title.innerHTML = '⚡ <strong>Mobile DevTools</strong>';
    title.style.cssText = 'color: #007acc; font-size: 13px;';
    
    const version = document.createElement('span');
    version.textContent = 'v2.0';
    version.style.cssText = 'font-size: 9px; color: #6a9955; background: #252526; padding: 2px 5px; border-radius: 3px;';
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(version);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; gap: 6px;';
    
    // Export button
    const exportBtn = createButton('💾', 'Export logs', '#3c3c3c');
    exportBtn.onclick = exportLogs;
    
    // Clear button
    const clearBtn = createButton('🗑️', 'Clear current tab', '#3c3c3c');
    clearBtn.onclick = clearCurrentTab;
    
    // Minimize button
    const minimizeBtn = createButton('−', 'Minimize', '#3c3c3c');
    minimizeBtn.onclick = () => panel.style.display = 'none';
    
    // Close button
    const closeBtn = createButton('✕', 'Close and remove', '#c74747');
    closeBtn.onclick = () => {
      panel.remove();
      window.MobileDevToolsInjected = false;
      restoreOriginalConsole();
      restoreOriginalFetch();
      restoreOriginalXHR();
    };
    
    buttonGroup.appendChild(exportBtn);
    buttonGroup.appendChild(clearBtn);
    buttonGroup.appendChild(minimizeBtn);
    buttonGroup.appendChild(closeBtn);
    
    topBar.appendChild(titleContainer);
    topBar.appendChild(buttonGroup);
    
    return topBar;
  }
  
  function createButton(text, title, bgColor) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.title = title;
    btn.style.cssText = `
      background: ${bgColor};
      color: white;
      border: none;
      border-radius: 3px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      transition: opacity 0.2s;
    `;
    btn.onmouseover = () => btn.style.opacity = '0.8';
    btn.onmouseout = () => btn.style.opacity = '1';
    return btn;
  }
  
  function createTabBar() {
    const tabBar = document.createElement('div');
    tabBar.id = 'devtools-tab-bar';
    tabBar.style.cssText = `
      background: #252526;
      display: flex;
      border-bottom: 1px solid #3e3e42;
      overflow-x: auto;
      user-select: none;
    `;
    
    const tabs = [
      { id: 'console', icon: '💬', label: 'Console' },
      { id: 'elements', icon: '🔍', label: 'Elements' },
      { id: 'network', icon: '🌐', label: 'Network' },
      { id: 'storage', icon: '💾', label: 'Storage' },
      { id: 'performance', icon: '⚡', label: 'Performance' },
      { id: 'styles', icon: '🎨', label: 'Styles' }
    ];
    
    tabs.forEach(tab => {
      const tabBtn = document.createElement('button');
      tabBtn.id = `tab-${tab.id}`;
      tabBtn.innerHTML = `${tab.icon} ${tab.label}`;
      tabBtn.style.cssText = `
        background: transparent;
        color: #999;
        border: none;
        padding: 10px 15px;
        cursor: pointer;
        font-size: 11px;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        white-space: nowrap;
      `;
      
      tabBtn.onclick = () => switchTab(tab.id);
      tabBar.appendChild(tabBtn);
    });
    
    return tabBar;
  }
  
  function createContentArea() {
    const contentArea = document.createElement('div');
    contentArea.id = 'devtools-content';
    contentArea.style.cssText = `
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #1e1e1e;
    `;
    
    return contentArea;
  }
  
  // ===========================
  // TAB SWITCHING
  // ===========================
  
  function switchTab(tabId) {
    state.currentTab = tabId;
    
    // Update tab buttons
    document.querySelectorAll('#devtools-tab-bar button').forEach(btn => {
      if (btn.id === `tab-${tabId}`) {
        btn.style.color = '#fff';
        btn.style.borderBottomColor = '#007acc';
        btn.style.background = '#1e1e1e';
      } else {
        btn.style.color = '#999';
        btn.style.borderBottomColor = 'transparent';
        btn.style.background = 'transparent';
      }
    });
    
    // Render content
    const contentArea = document.getElementById('devtools-content');
    if (!contentArea) return;
    
    switch(tabId) {
      case 'console':
        renderConsoleTab(contentArea);
        break;
      case 'elements':
        renderElementsTab(contentArea);
        break;
      case 'network':
        renderNetworkTab(contentArea);
        break;
      case 'storage':
        renderStorageTab(contentArea);
        break;
      case 'performance':
        renderPerformanceTab(contentArea);
        break;
      case 'styles':
        renderStylesTab(contentArea);
        break;
    }
  }
  
  // ===========================
  // CONSOLE TAB
  // ===========================
  
  function renderConsoleTab(container) {
    container.innerHTML = '';
    
    const output = document.createElement('div');
    output.id = 'console-output';
    output.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      line-height: 1.5;
    `;
    
    // Render existing logs
    state.logs.forEach(log => {
      output.appendChild(createLogEntry(log.message, log.type, log.timestamp));
    });
    
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
      background: #252526;
      padding: 10px;
      border-top: 1px solid #3e3e42;
      display: flex;
      gap: 8px;
    `;
    
    const input = document.createElement('input');
    input.id = 'console-input';
    input.type = 'text';
    input.placeholder = 'Enter JavaScript (↑↓ for history)...';
    input.style.cssText = `
      flex: 1;
      background: #3c3c3c;
      color: #d4d4d4;
      border: 1px solid #555;
      border-radius: 3px;
      padding: 8px;
      font-family: inherit;
      font-size: 11px;
      outline: none;
    `;
    
    input.onfocus = () => input.style.borderColor = '#007acc';
    input.onblur = () => input.style.borderColor = '#555';
    
    // Command history navigation
    input.onkeydown = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (state.historyIndex < state.consoleHistory.length - 1) {
          state.historyIndex++;
          input.value = state.consoleHistory[state.consoleHistory.length - 1 - state.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (state.historyIndex > 0) {
          state.historyIndex--;
          input.value = state.consoleHistory[state.consoleHistory.length - 1 - state.historyIndex];
        } else {
          state.historyIndex = -1;
          input.value = '';
        }
      } else if (e.key === 'Enter') {
        executeConsoleCommand(input.value);
        input.value = '';
      }
    };
    
    const runBtn = document.createElement('button');
    runBtn.textContent = '▶ Run';
    runBtn.style.cssText = `
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 8px 16px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s;
    `;
    runBtn.onmouseover = () => runBtn.style.background = '#1177bb';
    runBtn.onmouseout = () => runBtn.style.background = '#0e639c';
    runBtn.onclick = () => {
      executeConsoleCommand(input.value);
      input.value = '';
    };
    
    inputArea.appendChild(input);
    inputArea.appendChild(runBtn);
    
    container.appendChild(output);
    container.appendChild(inputArea);
    
    // Auto-scroll to bottom
    output.scrollTop = output.scrollHeight;
  }
  
  function createLogEntry(message, type = 'log', timestamp = Date.now()) {
    const entry = document.createElement('div');
    entry.style.cssText = `
      padding: 6px 0;
      border-bottom: 1px solid #2d2d30;
      display: flex;
      gap: 8px;
      font-size: 11px;
    `;
    
    const time = new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    
    const timeSpan = document.createElement('span');
    timeSpan.style.cssText = 'color: #6a9955; font-size: 9px; flex-shrink: 0;';
    timeSpan.textContent = time;
    
    const typeSpan = document.createElement('span');
    typeSpan.style.cssText = 'flex-shrink: 0; font-weight: bold;';
    
    const content = document.createElement('span');
    content.style.cssText = 'flex: 1; word-break: break-all;';
    
    // Color coding
    const typeConfig = {
      error: { icon: '❌', color: '#f48771' },
      warn: { icon: '⚠️', color: '#dcdcaa' },
      info: { icon: 'ℹ️', color: '#4fc1ff' },
      result: { icon: '←', color: '#4ec9b0' },
      command: { icon: '>', color: '#ce9178' },
      log: { icon: '○', color: '#9cdcfe' }
    };
    
    const config = typeConfig[type] || typeConfig.log;
    typeSpan.textContent = config.icon;
    typeSpan.style.color = config.color;
    content.style.color = config.color;
    
    // Format message
    let formattedMessage;
    try {
      if (typeof message === 'object' && message !== null) {
        if (message instanceof Error) {
          formattedMessage = `${message.name}: ${message.message}\n${message.stack || ''}`;
        } else if (message instanceof HTMLElement) {
          formattedMessage = `<${message.tagName.toLowerCase()}${message.id ? '#' + message.id : ''}${message.className ? '.' + message.className.split(' ').join('.') : ''}>`;
        } else {
          formattedMessage = JSON.stringify(message, null, 2);
        }
      } else {
        formattedMessage = String(message);
      }
    } catch (e) {
      formattedMessage = `[Error formatting: ${e.message}]`;
    }
    
    content.textContent = formattedMessage;
    
    entry.appendChild(timeSpan);
    entry.appendChild(typeSpan);
    entry.appendChild(content);
    
    return entry;
  }
  
  function executeConsoleCommand(code) {
    if (!code.trim()) return;
    
    // Add to history
    state.consoleHistory.push(code);
    state.historyIndex = -1;
    
    // Add command to logs
    addLog(code, 'command');
    
    try {
      const result = (0, eval)(code);
      addLog(result !== undefined ? result : 'undefined', 'result');
    } catch (error) {
      addLog(error, 'error');
    }
  }
  
  // ===========================
  // ELEMENTS TAB
  // ===========================
  
  function renderElementsTab(container) {
    container.innerHTML = '';
    
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      background: #252526;
      padding: 8px;
      border-bottom: 1px solid #3e3e42;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    `;
    
    const inspectBtn = document.createElement('button');
    inspectBtn.textContent = '🔍 Select Element';
    inspectBtn.style.cssText = `
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 6px 12px;
      font-size: 11px;
      cursor: pointer;
    `;
    inspectBtn.onclick = startElementInspection;
    
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄 Refresh';
    refreshBtn.style.cssText = inspectBtn.style.cssText;
    refreshBtn.onclick = () => renderElementsTab(container);
    
    toolbar.appendChild(inspectBtn);
    toolbar.appendChild(refreshBtn);
    
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    `;
    
    if (state.selectedElement) {
      content.appendChild(renderElementDetails(state.selectedElement));
    } else {
      content.innerHTML = `
        <div style="color: #999; text-align: center; padding: 40px 20px;">
          Click "Select Element" to inspect any element on the page
        </div>
      `;
    }
    
    container.appendChild(toolbar);
    container.appendChild(content);
  }
  
  function startElementInspection() {
    const overlay = document.createElement('div');
    overlay.id = 'element-inspector-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 122, 204, 0.1);
      z-index: 2147483646;
      cursor: crosshair;
    `;
    
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: fixed;
      background: #252526;
      color: #d4d4d4;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 11px;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(tooltip);
    
    let highlightedElement = null;
    let highlightBox = null;
    
    overlay.onmousemove = (e) => {
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (!element || element === overlay || element === tooltip) return;
      
      if (highlightedElement !== element) {
        highlightedElement = element;
        
        // Remove old highlight
        if (highlightBox) highlightBox.remove();
        
        // Create new highlight
        const rect = element.getBoundingClientRect();
        highlightBox = document.createElement('div');
        highlightBox.style.cssText = `
          position: fixed;
          top: ${rect.top}px;
          left: ${rect.left}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          border: 2px solid #007acc;
          background: rgba(0, 122, 204, 0.2);
          pointer-events: none;
          z-index: 2147483646;
        `;
        document.body.appendChild(highlightBox);
        
        // Update tooltip
        tooltip.textContent = getElementPath(element);
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 10) + 'px';
        tooltip.style.top = (e.clientY + 10) + 'px';
      }
    };
    
    overlay.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (element && element !== overlay) {
        state.selectedElement = element;
        switchTab('elements');
      }
      
      overlay.remove();
      tooltip.remove();
      if (highlightBox) highlightBox.remove();
    };
    
    document.body.appendChild(overlay);
  }
  
  function renderElementDetails(element) {
    const details = document.createElement('div');
    
    // Element path
    const path = document.createElement('div');
    path.style.cssText = 'color: #4ec9b0; margin-bottom: 15px; font-weight: bold;';
    path.textContent = getElementPath(element);
    
    // HTML
    const htmlSection = createSection('HTML', element.outerHTML.substring(0, 500) + (element.outerHTML.length > 500 ? '...' : ''));
    
    // Attributes
    const attrs = Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`).join('\n');
    const attrSection = createSection('Attributes', attrs || 'No attributes');
    
    // Computed styles
    const computed = window.getComputedStyle(element);
    const importantStyles = [
      'display', 'position', 'width', 'height', 
      'margin', 'padding', 'color', 'background-color',
      'font-size', 'font-family', 'border'
    ];
    const styles = importantStyles
      .map(prop => `${prop}: ${computed.getPropertyValue(prop)}`)
      .join('\n');
    const styleSection = createSection('Computed Styles', styles);
    
    // Event listeners
    const events = getEventListeners(element);
    const eventSection = createSection('Event Listeners', events || 'None detected');
    
    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = 'margin-top: 15px; display: flex; gap: 8px; flex-wrap: wrap;';
    
    const hideBtn = createButton('🙈 Hide', 'Hide element', '#3c3c3c');
    hideBtn.onclick = () => {
      element.style.display = 'none';
      addLog('Element hidden', 'info');
    };
    
    const showBtn = createButton('👁️ Show', 'Show element', '#3c3c3c');
    showBtn.onclick = () => {
      element.style.display = '';
      addLog('Element shown', 'info');
    };
    
    const deleteBtn = createButton('🗑️ Delete', 'Remove element', '#c74747');
    deleteBtn.onclick = () => {
      if (confirm('Delete this element?')) {
        element.remove();
        state.selectedElement = null;
        addLog('Element deleted', 'info');
        switchTab('elements');
      }
    };
    
    const copyBtn = createButton('📋 Copy HTML', 'Copy to clipboard', '#3c3c3c');
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(element.outerHTML).then(() => {
        addLog('HTML copied to clipboard', 'info');
      });
    };
    
    actions.appendChild(hideBtn);
    actions.appendChild(showBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(copyBtn);
    
    details.appendChild(path);
    details.appendChild(htmlSection);
    details.appendChild(attrSection);
    details.appendChild(styleSection);
    details.appendChild(eventSection);
    details.appendChild(actions);
    
    return details;
  }
  
  function createSection(title, content) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 15px;';
    
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = 'color: #569cd6; font-weight: bold; margin-bottom: 5px; font-size: 12px;';
    
    const contentEl = document.createElement('pre');
    contentEl.textContent = content;
    contentEl.style.cssText = `
      background: #252526;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      color: #d4d4d4;
      font-size: 10px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-all;
    `;
    
    section.appendChild(titleEl);
    section.appendChild(contentEl);
    
    return section;
  }
  
  function getEventListeners(element) {
    const events = [];
    const eventTypes = ['click', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 
                       'touchstart', 'touchend', 'touchmove', 'keydown', 'keyup', 
                       'submit', 'change', 'input', 'focus', 'blur', 'scroll'];
    
    eventTypes.forEach(type => {
      if (element['on' + type]) {
        events.push(`${type}: [Function]`);
      }
    });
    
    return events.length > 0 ? events.join('\n') : null;
  }
  
  // ===========================
  // NETWORK TAB
  // ===========================
  
  function renderNetworkTab(container) {
    container.innerHTML = '';
    
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      background: #252526;
      padding: 8px;
      border-bottom: 1px solid #3e3e42;
      display: flex;
      gap: 8px;
      align-items: center;
    `;
    
    const clearBtn = createButton('🗑️ Clear', 'Clear network logs', '#3c3c3c');
    clearBtn.onclick = () => {
      state.networkRequests = [];
      renderNetworkTab(container);
    };
    
    const countBadge = document.createElement('span');
    countBadge.style.cssText = `
      background: #007acc;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
    `;
    countBadge.textContent = `${state.networkRequests.length} requests`;
    
    toolbar.appendChild(clearBtn);
    toolbar.appendChild(countBadge);
    
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
    `;
    
    if (state.networkRequests.length === 0) {
      content.innerHTML = `
        <div style="color: #999; text-align: center; padding: 40px 20px;">
          No network requests captured yet. Requests made after loading DevTools will appear here.
        </div>
      `;
    } else {
      const table = document.createElement('div');
      table.style.cssText = 'font-size: 10px;';
      
      state.networkRequests.forEach((req, index) => {
        const row = document.createElement('div');
        row.style.cssText = `
          padding: 8px;
          border-bottom: 1px solid #2d2d30;
          cursor: pointer;
          transition: background 0.2s;
        `;
        row.onmouseover = () => row.style.background = '#252526';
        row.onmouseout = () => row.style.background = 'transparent';
        row.onclick = () => showNetworkDetails(req);
        
        const method = document.createElement('span');
        method.textContent = req.method;
        method.style.cssText = `
          display: inline-block;
          width: 50px;
          color: ${req.method === 'GET' ? '#4ec9b0' : '#dcdcaa'};
          font-weight: bold;
        `;
        
        const status = document.createElement('span');
        status.textContent = req.status || 'pending';
        status.style.cssText = `
          display: inline-block;
          width: 50px;
          color: ${!req.status ? '#999' : req.status < 400 ? '#4ec9b0' : '#f48771'};
        `;
        
        const url = document.createElement('span');
        url.textContent = req.url.length > 60 ? req.url.substring(0, 60) + '...' : req.url;
        url.style.cssText = 'color: #9cdcfe;';
        
        const time = document.createElement('span');
        time.textContent = req.time ? formatTime(req.time) : '...';
        time.style.cssText = 'color: #6a9955; float: right;';
        
        row.appendChild(method);
        row.appendChild(status);
        row.appendChild(url);
        row.appendChild(time);
        
        table.appendChild(row);
      });
      
      content.appendChild(table);
    }
    
    container.appendChild(toolbar);
    container.appendChild(content);
  }
  
  function showNetworkDetails(req) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1e1e;
      border: 2px solid #007acc;
      border-radius: 8px;
      padding: 20px;
      max-width: 80%;
      max-height: 80%;
      overflow-y: auto;
      z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    
    const title = document.createElement('h3');
    title.textContent = `${req.method} ${req.url}`;
    title.style.cssText = 'color: #007acc; margin-top: 0;';
    
    const details = `
      Status: ${req.status || 'pending'}
      Time: ${req.time ? formatTime(req.time) : 'N/A'}
      Type: ${req.type || 'unknown'}
      
      Headers:
      ${JSON.stringify(req.headers || {}, null, 2)}
      
      Response:
      ${req.response ? JSON.stringify(req.response, null, 2) : 'N/A'}
    `;
    
    const content = document.createElement('pre');
    content.textContent = details;
    content.style.cssText = 'font-size: 10px; line-height: 1.5; color: #d4d4d4;';
    
    const closeBtn = createButton('✕ Close', 'Close', '#c74747');
    closeBtn.onclick = () => modal.remove();
    closeBtn.style.marginTop = '15px';
    
    modal.appendChild(title);
    modal.appendChild(content);
    modal.appendChild(closeBtn);
    
    document.body.appendChild(modal);
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeModal(e) {
        if (!modal.contains(e.target)) {
          modal.remove();
          document.removeEventListener('click', closeModal);
        }
      });
    }, 100);
  }
  
  // ===========================
  // STORAGE TAB
  // ===========================
  
  function renderStorageTab(container) {
    container.innerHTML = '';
    
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 15px;
    `;
    
    // Cookies
    content.appendChild(createStorageSection('🍪 Cookies', getCookies(), 'cookie'));
    
    // LocalStorage
    content.appendChild(createStorageSection('💾 LocalStorage', getLocalStorage(), 'localStorage'));
    
    // SessionStorage
    content.appendChild(createStorageSection('📝 SessionStorage', getSessionStorage(), 'sessionStorage'));
    
    container.appendChild(content);
  }
  
  function createStorageSection(title, items, type) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 25px;';
    
    const header = document.createElement('div');
    header.style.cssText = `
      color: #007acc;
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `${title} <span style="color: #6a9955; font-size: 10px;">${items.length} items</span>`;
    
    const table = document.createElement('div');
    table.style.cssText = `
      background: #252526;
      border-radius: 4px;
      overflow: hidden;
    `;
    
    if (items.length === 0) {
      table.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Empty</div>';
    } else {
      items.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = `
          padding: 10px;
          border-bottom: 1px solid #1e1e1e;
          display: flex;
          gap: 10px;
          align-items: center;
        `;
        
        const key = document.createElement('div');
        key.textContent = item.key;
        key.style.cssText = 'color: #4ec9b0; font-weight: bold; flex: 1; word-break: break-all;';
        
        const value = document.createElement('div');
        value.textContent = item.value.length > 50 ? item.value.substring(0, 50) + '...' : item.value;
        value.style.cssText = 'color: #d4d4d4; flex: 2; word-break: break-all; font-size: 10px;';
        
        const deleteBtn = createButton('🗑️', 'Delete', '#c74747');
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.style.fontSize = '10px';
        deleteBtn.onclick = () => {
          deleteStorageItem(type, item.key);
          renderStorageTab(container.parentElement);
        };
        
        row.appendChild(key);
        row.appendChild(value);
        row.appendChild(deleteBtn);
        
        table.appendChild(row);
      });
    }
    
    section.appendChild(header);
    section.appendChild(table);
    
    return section;
  }
  
  function getCookies() {
    return document.cookie.split(';').filter(c => c.trim()).map(cookie => {
      const [key, ...valueParts] = cookie.split('=');
      return { key: key.trim(), value: valueParts.join('=').trim() };
    });
  }
  
  function getLocalStorage() {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      items.push({ key, value: localStorage.getItem(key) });
    }
    return items;
  }
  
  function getSessionStorage() {
    const items = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      items.push({ key, value: sessionStorage.getItem(key) });
    }
    return items;
  }
  
  function deleteStorageItem(type, key) {
    switch(type) {
      case 'cookie':
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        addLog(`Cookie "${key}" deleted`, 'info');
        break;
      case 'localStorage':
        localStorage.removeItem(key);
        addLog(`LocalStorage "${key}" deleted`, 'info');
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(key);
        addLog(`SessionStorage "${key}" deleted`, 'info');
        break;
    }
  }
  
  // ===========================
  // PERFORMANCE TAB
  // ===========================
  
  function renderPerformanceTab(container) {
    container.innerHTML = '';
    
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 15px;
    `;
    
    // Page Load Performance
    const loadSection = createPerformanceSection('⚡ Page Load Performance', getLoadPerformance());
    
    // Memory Usage
    const memorySection = createPerformanceSection('💾 Memory Usage', getMemoryInfo());
    
    // FPS Monitor
    const fpsSection = createPerformanceSection('📊 FPS Monitor', getFPSInfo());
    
    // Resource Timing
    const resourceSection = createPerformanceSection('📦 Resource Timing', getResourceTiming());
    
    content.appendChild(loadSection);
    content.appendChild(memorySection);
    content.appendChild(fpsSection);
    content.appendChild(resourceSection);
    
    container.appendChild(content);
  }
  
  function createPerformanceSection(title, data) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 25px;';
    
    const header = document.createElement('div');
    header.textContent = title;
    header.style.cssText = 'color: #007acc; font-weight: bold; font-size: 13px; margin-bottom: 10px;';
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: #252526;
      padding: 15px;
      border-radius: 4px;
      font-size: 11px;
      line-height: 1.8;
    `;
    
    if (typeof data === 'string') {
      content.textContent = data;
    } else {
      content.innerHTML = Object.entries(data)
        .map(([key, value]) => `
          <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span style="color: #9cdcfe;">${key}:</span>
            <span style="color: #4ec9b0; font-weight: bold;">${value}</span>
          </div>
        `).join('');
    }
    
    section.appendChild(header);
    section.appendChild(content);
    
    return section;
  }
  
  function getLoadPerformance() {
    const perf = performance.timing;
    return {
      'DOM Content Loaded': formatTime(perf.domContentLoadedEventEnd - perf.navigationStart),
      'Page Load Complete': formatTime(perf.loadEventEnd - perf.navigationStart),
      'DNS Lookup': formatTime(perf.domainLookupEnd - perf.domainLookupStart),
      'TCP Connection': formatTime(perf.connectEnd - perf.connectStart),
      'Server Response': formatTime(perf.responseEnd - perf.requestStart),
      'DOM Processing': formatTime(perf.domComplete - perf.domLoading)
    };
  }
  
  function getMemoryInfo() {
    if (performance.memory) {
      return {
        'Used JS Heap': formatBytes(performance.memory.usedJSHeapSize),
        'Total JS Heap': formatBytes(performance.memory.totalJSHeapSize),
        'Heap Limit': formatBytes(performance.memory.jsHeapSizeLimit),
        'Usage %': ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
      };
    }
    return 'Memory API not available';
  }
  
  function getFPSInfo() {
    let lastTime = performance.now();
    let frames = 0;
    let fps = 0;
    
    function countFrames() {
      frames++;
      const currentTime = performance.now();
      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
      }
      requestAnimationFrame(countFrames);
    }
    
    countFrames();
    
    return {
      'Current FPS': fps || 'Calculating...',
      'Target': '60 FPS',
      'Status': fps >= 55 ? '✅ Smooth' : fps >= 30 ? '⚠️ Moderate' : '❌ Slow'
    };
  }
  
  function getResourceTiming() {
    const resources = performance.getEntriesByType('resource');
    const summary = {
      'Total Resources': resources.length,
      'Scripts': resources.filter(r => r.initiatorType === 'script').length,
      'Stylesheets': resources.filter(r => r.initiatorType === 'css' || r.initiatorType === 'link').length,
      'Images': resources.filter(r => r.initiatorType === 'img').length,
      'XHR/Fetch': resources.filter(r => r.initiatorType === 'xmlhttprequest' || r.initiatorType === 'fetch').length,
      'Total Transfer Size': formatBytes(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0))
    };
    return summary;
  }
  
  // ===========================
  // STYLES TAB
  // ===========================
  
  function renderStylesTab(container) {
    container.innerHTML = '';
    
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      background: #252526;
      padding: 8px;
      border-bottom: 1px solid #3e3e42;
      display: flex;
      gap: 8px;
    `;
    
    const info = document.createElement('div');
    info.textContent = '💡 Live CSS Editor - Changes apply instantly';
    info.style.cssText = 'color: #6a9955; font-size: 10px; padding: 4px;';
    
    toolbar.appendChild(info);
    
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 15px;
    `;
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = `/* Enter CSS here - Example:
body {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.my-class {
  display: none;
}
*/`;
    textarea.style.cssText = `
      flex: 1;
      background: #1e1e1e;
      color: #d4d4d4;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      padding: 12px;
      font-family: 'Consolas', monospace;
      font-size: 12px;
      resize: none;
      outline: none;
    `;
    
    const applyBtn = document.createElement('button');
    applyBtn.textContent = '✨ Apply Styles';
    applyBtn.style.cssText = `
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 20px;
      margin-top: 10px;
      font-weight: bold;
      cursor: pointer;
      font-size: 12px;
    `;
    
    let styleElement = null;
    
    applyBtn.onclick = () => {
      if (styleElement) styleElement.remove();
      
      styleElement = document.createElement('style');
      styleElement.id = 'devtools-custom-styles';
      styleElement.textContent = textarea.value;
      document.head.appendChild(styleElement);
      
      addLog('Custom styles applied', 'info');
      applyBtn.textContent = '✅ Styles Applied!';
      setTimeout(() => applyBtn.textContent = '✨ Apply Styles', 2000);
    };
    
    // Quick presets
    const presets = document.createElement('div');
    presets.style.cssText = 'margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;';
    
    const presetData = [
      { name: '🌈 Rainbow', css: 'body { background: linear-gradient(135deg, #667eea, #764ba2, #f093fb, #4facfe) !important; }' },
      { name: '🌙 Dark', css: 'body { background: #000 !important; color: #fff !important; } * { border-color: #333 !important; }' },
      { name: '🔴 Red Border', css: '* { border: 1px solid red !important; }' },
      { name: '🧹 Clean', css: 'img, iframe, video { display: none !important; }' }
    ];
    
    presetData.forEach(preset => {
      const btn = createButton(preset.name, 'Apply preset', '#3c3c3c');
      btn.style.fontSize = '10px';
      btn.onclick = () => {
        textarea.value = preset.css;
        applyBtn.onclick();
      };
      presets.appendChild(btn);
    });
    
    content.appendChild(textarea);
    content.appendChild(applyBtn);
    content.appendChild(presets);
    
    container.appendChild(toolbar);
    container.appendChild(content);
  }
  
  // ===========================
  // CONSOLE INTERCEPTION
  // ===========================
  
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
  
  function addLog(message, type = 'log') {
    const logEntry = {
      message,
      type,
      timestamp: Date.now()
    };
    
    state.logs.push(logEntry);
    
    // Update console tab if active
    if (state.currentTab === 'console') {
      const output = document.getElementById('console-output');
      if (output) {
        output.appendChild(createLogEntry(message, type, logEntry.timestamp));
        output.scrollTop = output.scrollHeight;
      }
    }
  }
  
  function interceptConsole() {
    console.log = function(...args) {
      originalConsole.log.apply(console, args);
      args.forEach(arg => addLog(arg, 'log'));
    };
    
    console.error = function(...args) {
      originalConsole.error.apply(console, args);
      args.forEach(arg => addLog(arg, 'error'));
    };
    
    console.warn = function(...args) {
      originalConsole.warn.apply(console, args);
      args.forEach(arg => addLog(arg, 'warn'));
    };
    
    console.info = function(...args) {
      originalConsole.info.apply(console, args);
      args.forEach(arg => addLog(arg, 'info'));
    };
  }
  
  function restoreOriginalConsole() {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
  
  // ===========================
  // NETWORK INTERCEPTION
  // ===========================
  
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  function interceptNetwork() {
    // Intercept fetch
    window.fetch = function(...args) {
      const startTime = performance.now();
      const url = args[0];
      const options = args[1] || {};
      
      const request = {
        method: options.method || 'GET',
        url: url,
        type: 'fetch',
        headers: options.headers || {},
        startTime: Date.now()
      };
      
      state.networkRequests.push(request);
      
      return originalFetch.apply(this, args)
        .then(response => {
          request.status = response.status;
          request.time = performance.now() - startTime;
          return response.clone().text().then(text => {
            try {
              request.response = JSON.parse(text);
            } catch {
              request.response = text.substring(0, 200);
            }
            return response;
          });
        })
        .catch(error => {
          request.status = 'error';
          request.error = error.message;
          request.time = performance.now() - startTime;
          throw error;
        });
    };
    
    // Intercept XHR
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._devtoolsRequest = {
        method,
        url,
        type: 'xhr',
        startTime: Date.now()
      };
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      if (this._devtoolsRequest) {
        const startTime = performance.now();
        state.networkRequests.push(this._devtoolsRequest);
        
        this.addEventListener('loadend', () => {
          this._devtoolsRequest.status = this.status;
          this._devtoolsRequest.time = performance.now() - startTime;
          try {
            this._devtoolsRequest.response = JSON.parse(this.responseText);
          } catch {
            this._devtoolsRequest.response = this.responseText.substring(0, 200);
          }
        });
      }
      
      return originalXHRSend.apply(this, args);
    };
  }
  
  function restoreOriginalFetch() {
    window.fetch = originalFetch;
  }
  
  function restoreOriginalXHR() {
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
  }
  
  // ===========================
  // UTILITY FUNCTIONS
  // ===========================
  
  function clearCurrentTab() {
    switch(state.currentTab) {
      case 'console':
        state.logs = [];
        const output = document.getElementById('console-output');
        if (output) output.innerHTML = '';
        break;
      case 'network':
        state.networkRequests = [];
        switchTab('network');
        break;
      default:
        addLog('Nothing to clear in this tab', 'info');
    }
  }
  
  function exportLogs() {
    let exportData = '';
    
    switch(state.currentTab) {
      case 'console':
        exportData = state.logs.map(log => 
          `[${new Date(log.timestamp).toISOString()}] [${log.type.toUpperCase()}] ${JSON.stringify(log.message)}`
        ).join('\n');
        downloadFile('console-logs.txt', exportData);
        break;
      case 'network':
        exportData = JSON.stringify(state.networkRequests, null, 2);
        downloadFile('network-logs.json', exportData);
        break;
      default:
        addLog('Export not available for this tab', 'warn');
    }
  }
  
  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`Exported to ${filename}`, 'info');
  }
  
  // ===========================
  // GESTURE ACTIVATION
  // ===========================
  
  let touchTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;
  const LONG_PRESS_DURATION = 800;
  const MOVE_THRESHOLD = 10;
  
  function showPanel() {
    const panel = document.getElementById('mobile-devtools-panel');
    if (panel) {
      panel.style.display = 'flex';
      addLog('DevTools reopened', 'info');
    }
  }
  
  function setupTouchActivation() {
    document.addEventListener('touchstart', function(e) {
      const panel = document.getElementById('mobile-devtools-panel');
      if (panel && panel.contains(e.target)) return;
      
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      
      touchTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(50);
        showPanel();
      }, LONG_PRESS_DURATION);
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
      if (touchTimer) {
        const moveX = Math.abs(e.touches[0].clientX - touchStartX);
        const moveY = Math.abs(e.touches[0].clientY - touchStartY);
        
        if (moveX > MOVE_THRESHOLD || moveY > MOVE_THRESHOLD) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      }
    }, { passive: true });
    
    document.addEventListener('touchend', function() {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    }, { passive: true });
    
    document.addEventListener('touchcancel', function() {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    }, { passive: true });
  }
  
  function setupDesktopActivation() {
    document.addEventListener('contextmenu', function(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        showPanel();
      }
    });
  }
  
  // ===========================
  // INITIALIZATION
  // ===========================
  
  function init() {
    // Create UI
    const panel = createDevToolsPanel();
    const topBar = createTopBar(panel);
    const tabBar = createTabBar();
    const contentArea = createContentArea();
    
    panel.appendChild(topBar);
    panel.appendChild(tabBar);
    panel.appendChild(contentArea);
    
    document.body.appendChild(panel);
    
    // Setup interception
    interceptConsole();
    interceptNetwork();
    
    // Setup gestures
    setupTouchActivation();
    setupDesktopActivation();
    
    // Load default tab
    switchTab('console');
    
    // Welcome messages
    addLog('🚀 Mobile DevTools V2.0 Ultimate Edition loaded!', 'result');
    addLog('📱 Mobile: Long-press (800ms) anywhere to reopen', 'info');
    addLog('🖥️  Desktop: Ctrl/Cmd + Right-Click to reopen', 'info');
    addLog('✨ Features: Console, Elements Inspector, Network Monitor, Storage Viewer, Performance Metrics, CSS Editor', 'info');
    
    // Log system info
    addLog(`💻 User Agent: ${navigator.userAgent}`, 'info');
    addLog(`📐 Viewport: ${window.innerWidth}×${window.innerHeight}`, 'info');
    addLog(`🔧 Device Pixel Ratio: ${window.devicePixelRatio}`, 'info');
  }
  
  // Start!
  init();
  
})();
