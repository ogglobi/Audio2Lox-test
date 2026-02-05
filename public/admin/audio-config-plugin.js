/**
 * Audio Configuration Plugin for Lox AudioServer Admin UI
 * Dynamically injects audio device and power management controls
 * Version: 2.1.0 - Feb 3 2026 - CSS and header nav improvements
 */

(function() {
  'use strict';
  
  console.log('AUDIO CONFIG PLUGIN LOADING');
  window.TEST_PLUGIN = true;

  const AudioConfigPlugin = {
    modal: null,
    currentTab: 'devices',

    // Initialize plugin
    init() {
      this.injectStyles();
      this.injectHTML();
      this.setupEventListeners();
      this.modal = document.getElementById('audioConfigModal');
      this.loadDevices();
    },

    // Inject CSS styles AFTER original UI CSS loads
    injectStyles() {
      // Wait for original CSS to load, then inject our CSS to override it
      setTimeout(() => {
        const style = document.createElement('style');
        console.log('INJECTING CSS STYLES');
        style.textContent = `
        /* Style Audio Config nav item to match original nav exactly */
        [data-audio-config] {
          list-style: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        [data-audio-config] button {
          background: none !important;
          border: none !important;
          padding: 8px 0 !important;
          cursor: pointer !important;
          font-weight: 400 !important;
          color: #333 !important;
          text-decoration: none !important;
          transition: color 0.3s ease !important;
          font-size: 12px !important;
          line-height: 1.5 !important;
          appearance: none !important;
          display: inline-block !important;
        }
        
        [data-audio-config] button:hover {
          color: #333 !important;
        }
        
        [data-audio-config] button.active,
        [data-audio-config] button:active {
          color: #333 !important;
        }
        
        [data-audio-config] .tabs__label {
          color: inherit !important;
        }
        
        .audio-config-modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 10000;
          align-items: center;
          justify-content: center;
        }
        .audio-config-modal.show {
          display: flex;
        }
        .audio-config-content {
          background: white;
          border-radius: 12px;
          max-width: 900px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .audio-config-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 12px 12px 0 0;
        }
        .audio-config-header h2 {
          margin: 0;
        }
        .audio-config-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
        }
        .audio-config-body {
          padding: 20px;
        }
        .audio-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #eee;
        }
        .audio-tab {
          padding: 10px 15px;
          border: none;
          background: none;
          cursor: pointer;
          color: #666;
          font-weight: 500;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
        }
        .audio-tab:hover {
          color: #333;
        }
        .audio-tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }
        .audio-tab-content {
          display: none;
        }
        .audio-tab-content.active {
          display: block;
        }
        .device-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          background: #f9f9f9;
        }
        .device-name {
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
        .channel-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-right: 5px;
          margin-bottom: 5px;
        }
        .channel-playback {
          background: #e3f2fd;
          color: #1976d2;
        }
        .channel-capture {
          background: #f3e5f5;
          color: #7b1fa2;
        }
        .loading {
          text-align: center;
          color: #999;
          padding: 20px;
        }
        .error {
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
        }
      `;
        document.head.appendChild(style);
        console.log('CSS STYLES INJECTED');
        
        // Hide logo with JavaScript (more reliable than CSS)
        this.hideLogo();
      }, 100);
    },

    hideLogo() {
      // Try multiple ways to find and hide the logo
      const logoSelectors = [
        'header svg',
        'header img',
        '[role="banner"] svg',
        '[role="banner"] img',
        '.logo',
        '.header-logo',
        'svg[data-icon="logo"]'
      ];
      
      logoSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.style.display = 'none';
          console.log('LOGO HIDDEN: ' + selector);
        });
      });
    },

    // Inject HTML elements - Header navigation instead of button
    injectHTML() {
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'audio-config-modal';
      modal.id = 'audioConfigModal';
      modal.innerHTML = `
        <div class="audio-config-content">
          <div class="audio-config-header">
            <h2>Audio Configuration</h2>
            <button class="audio-config-close" onclick="window.audioConfigPlugin.toggleModal()">×</button>
          </div>
          <div class="audio-config-body">
            <div class="audio-tabs">
              <button class="audio-tab active" onclick="window.audioConfigPlugin.switchTab('devices')">🎵 Audio Devices</button>
              <button class="audio-tab" onclick="window.audioConfigPlugin.switchTab('zones')">📍 Zone Mapping</button>
              <button class="audio-tab" onclick="window.audioConfigPlugin.switchTab('power')">⚡ Power Management</button>
            </div>
            
            <div id="devicesTab" class="audio-tab-content active">
              <button onclick="window.audioConfigPlugin.loadDevices()" style="margin-bottom: 15px; padding: 8px 15px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Refresh Devices</button>
              <div id="devicesList"></div>
            </div>

            <div id="zonesTab" class="audio-tab-content">
              <div id="zonesList"></div>
            </div>

            <div id="powerTab" class="audio-tab-content">
              <div id="powerStatus"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Try to add to header navigation (wait for the original nav to be available)
      this.addToHeaderNav();
    },

    addToHeaderNav() {
      // Find the header navigation in the original Admin UI
      // Wait a bit for the original UI to render
      setTimeout(() => {
        // Look for navigation elements - usually in a header or nav tag
        const nav = document.querySelector('nav') || 
                   document.querySelector('[role="navigation"]') ||
                   document.querySelector('header');
        
        if (nav) {
          // Find or create a list of navigation items
          let navList = nav.querySelector('ul') || nav.querySelector('[role="tablist"]');
          
          if (navList) {
            // Check if Audio Config tab already exists
            if (!navList.querySelector('[data-audio-config]')) {
              const li = document.createElement('li');
              li.setAttribute('data-audio-config', 'true');
              li.innerHTML = `<button type="button" onclick="window.audioConfigPlugin.toggleModal();"><span class="tabs__label">Audio Config</span></button>`;
              navList.appendChild(li);
              console.log('AUDIO CONFIG BUTTON ADDED TO NAV');
            }
          } else {
            console.warn('Navigation list not found');
          }
        } else {
          console.warn('Navigation element not found');
        }
      }, 1000);
    },

    setupEventListeners() {
      // Modal can be closed by clicking outside
      const modal = document.getElementById('audioConfigModal');
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.toggleModal();
        }
      });
    },

    toggleModal() {
      const modal = document.getElementById('audioConfigModal');
      if (modal) {
        modal.classList.toggle('show');
      }
    },

    switchTab(tabName) {
      this.currentTab = tabName;
      document.querySelectorAll('.audio-tab').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.audio-tab-content').forEach(content => content.classList.remove('active'));
      
      event.target.classList.add('active');
      document.getElementById(tabName + 'Tab').classList.add('active');
      
      // Load data for the active tab
      if (tabName === 'devices') {
        this.loadDevices();
      } else if (tabName === 'zones') {
        this.loadZones();
      } else if (tabName === 'power') {
        this.loadPowerStatus();
      }
    },

    async loadDevices() {
      const list = document.getElementById('devicesList');
      list.innerHTML = '<div class="loading">Loading audio devices...</div>';
      try {
        const response = await fetch('/admin/api/audio/devices');
        if (!response.ok) throw new Error('Failed to load devices');
        const data = await response.json();
        if (!data.devices || data.devices.length === 0) {
          list.innerHTML = '<div class="error">No audio devices found</div>';
          return;
        }
        list.innerHTML = data.devices.map(device => `
          <div class="device-card">
            <div class="device-name">${device.longName || device.name || device.id}</div>
            <div style="color: #666; font-size: 11px; margin-top: 5px;">ID: ${device.id}</div>
            <div style="margin-top: 8px;">
              ${(device.channels || []).map(ch => 
                `<span class="channel-badge ${ch.direction === 'playback' ? 'channel-playback' : 'channel-capture'}">
                  ${ch.direction}: ${ch.name}
                </span>`
              ).join('')}
            </div>
          </div>
        `).join('');
      } catch (err) {
        console.error('Audio device load error:', err);
        list.innerHTML = `<div class="error">Error loading devices: ${err.message}</div>`;
      }
    },

    async loadZones() {
      const list = document.getElementById('zonesList');
      list.innerHTML = '<div class="loading">Loading zones...</div>';
      try {
        const response = await fetch('/admin/api/config');
        if (!response.ok) throw new Error('Failed to load zones');
        const data = await response.json();
        const zones = data.config?.zones || [];
        if (zones.length === 0) {
          list.innerHTML = '<div class="error">No zones configured</div>';
          return;
        }
        list.innerHTML = zones.map(zone => `
          <div class="device-card">
            <div class="device-name">Zone ${zone.id}: ${zone.name || 'Unnamed'}</div>
            <div style="margin-bottom: 10px; color: #666; font-size: 14px;">
              ${zone.name ? `<p><strong>Name:</strong> ${zone.name}</p>` : ''}
              <p><strong>Transports:</strong> ${(zone.transports || []).map(t => t.type || 'unknown').join(', ') || 'None'}</p>
            </div>
            <select style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; width: 100%;">
              <option>-- Select output type --</option>
              <option>Squeezelite</option>
              <option>AirPlay</option>
              <option>DLNA</option>
              <option>Snapcast</option>
            </select>
          </div>
        `).join('');
      } catch (err) {
        console.error('Zone load error:', err);
        list.innerHTML = `<div class="error">Error loading zones: ${err.message}</div>`;
      }
    },

    async loadPowerStatus() {
      const status = document.getElementById('powerStatus');
      status.innerHTML = '<div class="loading">Loading power status...</div>';
      try {
        const response = await fetch('/admin/api/powermanager/status');
        if (!response.ok) throw new Error('Failed to load power status');
        const data = await response.json();
        
        if (!data.enabled) {
          status.innerHTML = `
            <div class="device-card">
              <div class="device-name">⚠️ PowerManager Disabled</div>
              <div style="margin: 15px 0; color: #999;">
                <p>PowerManager is not enabled or no USB relay device is connected.</p>
                <p style="font-size: 12px; margin-top: 10px;">To enable, set PM_ENABLED=true in environment variables.</p>
              </div>
            </div>
          `;
          return;
        }
        
        status.innerHTML = `
          <div class="device-card">
            <div class="device-name">Power Manager Status</div>
            <div style="margin: 15px 0;">
              <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #4caf50; font-weight: 600;">✓ ${data.message}</span></p>
              <p style="margin: 10px 0;"><strong>State:</strong> <span style="color: #4caf50; font-weight: 600;">${data.state.toUpperCase()}</span></p>
            </div>
            
            <div style="margin: 15px 0;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                🔌 USB Port:
              </label>
              <div style="display: flex; gap: 10px; align-items: flex-end;">
                <select id="usbPortSelect" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: white;">
                  <option>-- Loading ports --</option>
                </select>
                <button onclick="window.audioConfigPlugin.saveUsbPort()" style="padding: 8px 15px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Save</button>
              </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 15px;">
              <button onclick="window.audioConfigPlugin.testRelay()" style="flex: 1; padding: 10px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">⚡ Test Relay</button>
              <button onclick="window.audioConfigPlugin.powerOn()" style="flex: 1; padding: 10px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">🔌 Power ON</button>
              <button onclick="window.audioConfigPlugin.powerOff()" style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">⏻ Power OFF</button>
            </div>
          </div>
        `;
        
        // Load available ports
        this.loadUsbPorts();
      } catch (err) {
        console.error('Power status error:', err);
        status.innerHTML = `<div class="error">Error loading power status: ${err.message}</div>`;
      }
    },

    async loadUsbPorts() {
      try {
        const response = await fetch('/admin/api/powermanager/ports');
        if (!response.ok) throw new Error('Failed to load ports');
        const data = await response.json();
        
        const select = document.getElementById('usbPortSelect');
        if (!select) return;
        
        if (!data.ports || data.ports.length === 0) {
          select.innerHTML = '<option value="">No USB devices found</option>';
          return;
        }
        
        select.innerHTML = data.ports.map(port => {
          let label = port.path;
          if (port.manufacturer || port.product) {
            label += ` - ${port.manufacturer || ''}${port.manufacturer && port.product ? ' / ' : ''}${port.product || ''}`;
          }
          return `<option value="${port.path}" ${port.path === data.current ? 'selected' : ''}>${label}</option>`;
        }).join('');
      } catch (err) {
        console.error('Load USB ports error:', err);
        const select = document.getElementById('usbPortSelect');
        if (select) {
          select.innerHTML = '<option value="">Error loading ports</option>';
        }
      }
    },

    async saveUsbPort() {
      const select = document.getElementById('usbPortSelect');
      if (!select || !select.value) {
        alert('Please select a USB port');
        return;
      }
      
      try {
        const response = await fetch('/admin/api/powermanager/port', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ port: select.value })
        });
        if (response.ok) {
          alert('✓ USB port saved successfully!');
          this.loadPowerStatus();
        } else {
          alert('✗ Failed to save USB port');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    },

    async testRelay() {
      try {
        const response = await fetch('/admin/api/powermanager/test', { method: 'POST' });
        if (response.ok) {
          alert('✓ PowerManager test relay triggered successfully!');
          this.loadPowerStatus();
        } else {
          alert('✗ PowerManager test failed or not enabled');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    },

    async powerOn() {
      alert('🔌 Power ON - would trigger relay (API integration needed)');
      // TODO: Implement actual API call
    },

    async powerOff() {
      alert('⏻ Power OFF - would trigger relay (API integration needed)');
      // TODO: Implement actual API call
    }
  };

  // Initialize when DOM is ready
  function tryInit() {
    if (!document.body) {
      // DOM not ready yet, retry after a short delay
      setTimeout(tryInit, 100);
      return;
    }
    
    console.log('PLUGIN INIT CALLED');
    window.audioConfigPlugin = AudioConfigPlugin;
    AudioConfigPlugin.init();
    console.log('PLUGIN INITIALIZED');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
