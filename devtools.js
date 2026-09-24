/**
 * Mobile DevTools - Core Script
 * Version: 1.0.0
 * GitHub: https://github.com/yourusername/mobile-devtools
 * 
 * A lightweight F12 alternative for mobile Chrome and restricted desktop environments.
 * This script is loaded dynamically via a bookmarklet loader.
 * 
 * Features:
 * - Console log/error/warn interception and display
 * - Interactive JavaScript execution environment
 * - Touch-based (long-press 800ms) and Ctrl+Right-click activation
 * - VS Code dark theme UI
 * - Duplicate injection prevention
 * - Remote update capability (update GitHub, changes propagate instantly)
 */

(function() {
  'use strict';
  
  // ===========================
  // DUPLICATE INJECTION GUARD
  // ===========================
  
  if (window.MobileDevToolsInjected) {
    console.warn('[Mobile DevTools] Already injected on this page');
    // If panel exists, just show it
    const existingPanel = document.getElementById('mobile-devtools-panel');
    if (existingPanel) {
      existingPanel.style.display = 'flex';
    }
    return;
  }
  
  // Mark as injected
  window.MobileDevToolsInjected = true;
  
  console.log('[Mobile DevTools] Initializing v1.0.0...');
  
  // ===========================
  // UI CONSTRUCTION
  // ===========================
  
  /**
   * Creates the main DevTools panel with VS Code dark theme
   */
  function createDevToolsPanel() {
    const panel = document.createElement('div');
    panel.id = 'mobile-devtools-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50vh;
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;
      font-size: 12px;
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      border-top: 2px solid #007acc;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.6);
      transition: transform 0.3s ease;
    `;
    
    return panel;
  }
  
  /**
   * Creates the top bar with title, version, and close button
   */
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
      cursor: move;
    `;
    
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    
    const title = document.createElement('span');
    title.textContent = '⚡ Mobile DevTools';
    title.style.cssText = `
      font-weight: bold;
      color: #007acc;
      font-size: 14px;
    `;
    
    const version = document.createElement('span');
    version.textContent = 'v1.0.0';
    version.style.cssText = `
      font-size: 10px;
      color: #6a9955;
      background: #252526;
      padding: 2px 6px;
      border-radius: 3px;
    `;
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(version);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; gap: 8px;';
    
    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Clear';
    clearBtn.title = 'Clear console output';
    clearBtn.style.cssText = `
      background: #3c3c3c;
      color: #d4d4d4;
      border: 1px solid #555;
      border-radius: 3px;
      padding: 4px 10px;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    clearBtn.onmouseover = () => clearBtn.style.background = '#505050';
    clearBtn.onmouseout = () => clearBtn.style.background = '#3c3c3c';
    clearBtn.onclick = () => {
      const output = document.getElementById('mobile-devtools-output');
      if (output) output.innerHTML = '';
    };
    
    // Minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.title = 'Minimize panel';
    minimizeBtn.style.cssText = `
      background: #3c3c3c;
      color: white;
      border: 1px solid #555;
      border-radius: 3px;
      padding: 4px 10px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s;
    `;
    minimizeBtn.onmouseover = () => minimizeBtn.style.background = '#505050';
    minimizeBtn.onmouseout = () => minimizeBtn.style.background = '#3c3c3c';
    minimizeBtn.onclick = () => {
      panel.style.display = 'none';
    };
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close and remove DevTools';
    closeBtn.style.cssText = `
      background: #c74747;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 4px 10px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#e06c6c';
    closeBtn.onmouseout = () => closeBtn.style.background = '#c74747';
    closeBtn.onclick = () => {
      panel.remove();
      window.MobileDevToolsInjected = false;
      console.log('[Mobile DevTools] Removed from page');
    };
    
    buttonGroup.appendChild(clearBtn);
    buttonGroup.appendChild(minimizeBtn);
    buttonGroup.appendChild(closeBtn);
    
    topBar.appendChild(titleContainer);
    topBar.appendChild(buttonGroup);
    
    return topBar;
  }
  
  /**
   * Creates the console output display area
   */
  function createConsoleOutput() {
    const consoleOutput = document.createElement('div');
    consoleOutput.id = 'mobile-devtools-output';
    consoleOutput.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 10px;
      background: #1e1e1e;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.5;
    `;
    
    return consoleOutput;
  }
  
  /**
   * Creates the input area with command box and run button
   */
  function createInputArea() {
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
      background: #252526;
      padding: 10px;
      border-top: 1px solid #3e3e42;
      display: flex;
      gap: 8px;
    `;
    
    const input = document.createElement('input');
    input.id = 'mobile-devtools-input';
    input.type = 'text';
    input.placeholder = 'Enter JavaScript command... (Press Enter to run)';
    input.style.cssText = `
      flex: 1;
      background: #3c3c3c;
      color: #d4d4d4;
      border: 1px solid #555;
      border-radius: 3px;
      padding: 8px 10px;
      font-family: 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;
      font-size: 12px;
      outline: none;
    `;
    input.onfocus = () => input.style.borderColor = '#007acc';
    input.onblur = () => input.style.borderColor = '#555';
    
    const runBtn = document.createElement('button');
    runBtn.id = 'mobile-devtools-run-btn';
    runBtn.textContent = '▶ Run';
    runBtn.style.cssText = `
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 8px 16px;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    `;
    runBtn.onmouseover = () => runBtn.style.background = '#1177bb';
    runBtn.onmouseout = () => runBtn.style.background = '#0e639c';
    
    inputArea.appendChild(input);
    inputArea.appendChild(runBtn);
    
    return inputArea;
  }
  
  // ===========================
  // CONSOLE INTERCEPTION
  // ===========================
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
  
  /**
   * Adds a formatted log entry to the console output
   */
  function addLogEntry(message, type = 'log') {
    const output = document.getElementById('mobile-devtools-output');
    if (!output) return;
    
    const entry = document.createElement('div');
    entry.style.cssText = `
      padding: 6px 0;
      border-bottom: 1px solid #2d2d30;
      display: flex;
      gap: 8px;
    `;
    
    // Timestamp
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    const timeSpan = document.createElement('span');
    timeSpan.style.cssText = 'color: #6a9955; font-size: 10px; flex-shrink: 0;';
    timeSpan.textContent = `[${timestamp}]`;
    
    // Type indicator
    const typeSpan = document.createElement('span');
    typeSpan.style.cssText = 'flex-shrink: 0; font-weight: bold;';
    
    // Content
    const content = document.createElement('span');
    content.style.cssText = 'flex: 1; word-break: break-all;';
    
    // Color coding and icon based on type
    switch(type) {
      case 'error':
        typeSpan.textContent = '❌';
        typeSpan.style.color = '#f48771';
        content.style.color = '#f48771';
        break;
      case 'warn':
        typeSpan.textContent = '⚠️';
        typeSpan.style.color = '#dcdcaa';
        content.style.color = '#dcdcaa';
        break;
      case 'info':
        typeSpan.textContent = 'ℹ️';
        typeSpan.style.color = '#4fc1ff';
        content.style.color = '#4fc1ff';
        break;
      case 'result':
        typeSpan.textContent = '✓';
        typeSpan.style.color = '#4ec9b0';
        content.style.color = '#4ec9b0';
        break;
      case 'command':
        typeSpan.textContent = '>';
        typeSpan.style.color = '#569cd6';
        content.style.color = '#ce9178';
        break;
      default:
        typeSpan.textContent = '○';
        typeSpan.style.color = '#9cdcfe';
        content.style.color = '#9cdcfe';
    }
    
    // Format message
    let formattedMessage;
    try {
      if (typeof message === 'object' && message !== null) {
        formattedMessage = JSON.stringify(message, null, 2);
      } else if (message === undefined) {
        formattedMessage = 'undefined';
      } else if (message === null) {
        formattedMessage = 'null';
      } else {
        formattedMessage = String(message);
      }
    } catch (e) {
      formattedMessage = `[Object: ${e.message}]`;
    }
    
    content.textContent = formattedMessage;
    
    entry.appendChild(timeSpan);
    entry.appendChild(typeSpan);
    entry.appendChild(content);
    output.appendChild(entry);
    
    // Auto-scroll to bottom
    output.scrollTop = output.scrollHeight;
  }
  
  /**
   * Override console methods to intercept logs
   */
  function interceptConsole() {
    console.log = function(...args) {
      originalConsole.log.apply(console, args);
      args.forEach(arg => addLogEntry(arg, 'log'));
    };
    
    console.error = function(...args) {
      originalConsole.error.apply(console, args);
      args.forEach(arg => addLogEntry(arg, 'error'));
    };
    
    console.warn = function(...args) {
      originalConsole.warn.apply(console, args);
      args.forEach(arg => addLogEntry(arg, 'warn'));
    };
    
    console.info = function(...args) {
      originalConsole.info.apply(console, args);
      args.forEach(arg => addLogEntry(arg, 'info'));
    };
  }
  
  // ===========================
  // JAVASCRIPT EXECUTION
  // ===========================
  
  /**
   * Executes JavaScript code and displays result
   */
  function executeCode(code) {
    addLogEntry(code, 'command');
    
    try {
      // Use indirect eval for global scope execution
      const result = (0, eval)(code);
      
      if (result !== undefined) {
        addLogEntry(result, 'result');
      } else {
        addLogEntry('undefined', 'result');
      }
    } catch (error) {
      addLogEntry(`${error.name}: ${error.message}`, 'error');
      
      // Show stack trace if available
      if (error.stack) {
        addLogEntry(error.stack, 'error');
      }
    }
  }
  
  /**
   * Sets up command execution handlers
   */
  function setupExecutionHandlers() {
    const input = document.getElementById('mobile-devtools-input');
    const runBtn = document.getElementById('mobile-devtools-run-btn');
    
    if (!input || !runBtn) return;
    
    // Run button click
    runBtn.onclick = () => {
      const code = input.value.trim();
      if (code) {
        executeCode(code);
        input.value = '';
      }
    };
    
    // Enter key press
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        runBtn.onclick();
      }
    });
  }
  
  // ===========================
  // GESTURE ACTIVATION
  // ===========================
  
  let touchTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;
  const LONG_PRESS_DURATION = 800; // milliseconds
  const MOVE_THRESHOLD = 10; // pixels
  
  /**
   * Shows the DevTools panel
   */
  function showPanel() {
    const panel = document.getElementById('mobile-devtools-panel');
    if (panel) {
      panel.style.display = 'flex';
      addLogEntry('Mobile DevTools reopened', 'info');
    }
  }
  
  /**
   * Sets up touch-based long-press activation
   */
  function setupTouchActivation() {
    // Touch start - begin long-press timer
    document.addEventListener('touchstart', function(e) {
      // Don't activate if touching inside the DevTools panel
      const panel = document.getElementById('mobile-devtools-panel');
      if (panel && panel.contains(e.target)) return;
      
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      
      touchTimer = setTimeout(() => {
        // Haptic feedback if supported
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        showPanel();
      }, LONG_PRESS_DURATION);
    }, { passive: true });
    
    // Touch move - cancel if moved too much
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
    
    // Touch end - clear timer
    document.addEventListener('touchend', function() {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    }, { passive: true });
    
    // Touch cancel - clear timer
    document.addEventListener('touchcancel', function() {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    }, { passive: true });
  }
  
  /**
   * Sets up desktop right-click activation
   */
  function setupDesktopActivation() {
    document.addEventListener('contextmenu', function(e) {
      // Only activate with Ctrl/Cmd + Right-Click
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        showPanel();
      }
    });
  }
  
  // ===========================
  // INITIALIZATION
  // ===========================
  
  /**
   * Main initialization function
   */
  function init() {
    // Create UI components
    const panel = createDevToolsPanel();
    const topBar = createTopBar(panel);
    const consoleOutput = createConsoleOutput();
    const inputArea = createInputArea();
    
    // Assemble panel
    panel.appendChild(topBar);
    panel.appendChild(consoleOutput);
    panel.appendChild(inputArea);
    
    // Inject into page
    document.body.appendChild(panel);
    
    // Setup functionality
    interceptConsole();
    setupExecutionHandlers();
    setupTouchActivation();
    setupDesktopActivation();
    
    // Welcome message
    addLogEntry('🚀 Mobile DevTools successfully loaded', 'result');
    addLogEntry('📱 Mobile: Long-press (800ms) anywhere to reopen', 'info');
    addLogEntry('🖥️ Desktop: Ctrl/Cmd + Right-Click to reopen', 'info');
    addLogEntry('Type JavaScript commands below and press Enter or click Run', 'info');
    
    console.log('[Mobile DevTools] Initialization complete');
  }
  
  // Start initialization
  init();
  
})();
