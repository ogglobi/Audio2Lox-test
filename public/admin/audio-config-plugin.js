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
        // Fetch zones, transport definitions, ALSA devices in parallel
        const [configRes, transportsRes, devicesRes] = await Promise.all([
          fetch('/admin/api/config'),
          fetch('/admin/api/transports'),
          fetch('/admin/api/audio/devices'),
        ]);
        if (!configRes.ok) throw new Error('Failed to load config');
        if (!transportsRes.ok) throw new Error('Failed to load transports');
        const configData = await configRes.json();
        const transportsData = await transportsRes.json();
        const devicesData = devicesRes.ok ? await devicesRes.json() : { devices: [] };

        const zones = configData.config?.zones || [];
        const transportDefs = transportsData.transports || [];
        const audioDevices = devicesData.devices || [];

        // Cache for use by other methods
        this._transportDefs = transportDefs;
        this._audioDevices = audioDevices;

        if (zones.length === 0) {
          list.innerHTML = '<div class="error">No zones configured</div>';
          return;
        }

        // Build ALSA reference panel
        const alsaPanel = audioDevices.length > 0 ? `
          <div style="background:#e8f5e9; border:1px solid #c8e6c9; border-radius:8px; padding:12px; margin-bottom:15px;">
            <div style="font-weight:600; color:#2e7d32; margin-bottom:8px;">🔊 Available ALSA Outputs</div>
            ${audioDevices.map(dev => {
              const playbackChannels = (dev.channels || []).filter(ch => ch.direction === 'playback');
              if (playbackChannels.length === 0) return '';
              return `<div style="margin-bottom:6px;">
                <span style="font-weight:600;">${dev.longName || dev.name}</span>
                <span style="color:#666; font-size:11px; margin-left:4px;">(${dev.id})</span>
                <div style="margin-top:2px;">
                  ${playbackChannels.map(ch =>
                    `<span class="channel-badge channel-playback" style="font-family:monospace;">${ch.id}</span>
                     <span style="font-size:11px; color:#666;">${ch.name}</span>`
                  ).join(' ')}
                </div>
              </div>`;
            }).join('')}
            <div style="font-size:11px; color:#666; margin-top:6px;">
              💡 Use these ALSA device IDs when configuring Snapcast clients (e.g. <code>snapclient -s &lt;server&gt; -o alsa:device=hw:1,0</code>)
            </div>
          </div>
        ` : '';

        list.innerHTML = alsaPanel + zones.map(zone => {
          const currentTransport = (zone.transports || [])[0] || null;
          const currentTypeId = currentTransport ? currentTransport.id : '';

          return `
            <div class="device-card" id="zone-card-${zone.id}">
              <div class="device-name">Zone ${zone.id}: ${zone.name || 'Unnamed'}</div>

              <div style="margin: 10px 0; color: #666; font-size: 13px;">
                <strong>Current:</strong>
                ${currentTransport
                  ? `<span style="color:#667eea; font-weight:600;">${this._labelForType(currentTypeId)}</span>`
                  : '<span style="color:#999;">None</span>'}
              </div>

              <!-- Output type selector -->
              <label style="display:block; margin-bottom:4px; font-weight:600; font-size:12px; color:#555;">Output Type</label>
              <select id="zone-type-${zone.id}" onchange="window.audioConfigPlugin.renderTypeFields(${zone.id})"
                      style="padding:8px; border:1px solid #ddd; border-radius:4px; width:100%; margin-bottom:10px; background:white;">
                <option value="">-- No output --</option>
                ${transportDefs.map(t =>
                  `<option value="${t.id}" ${t.id === currentTypeId ? 'selected' : ''}>${t.label}</option>`
                ).join('')}
              </select>

              <!-- Dynamic fields container -->
              <div id="zone-fields-${zone.id}" style="margin-bottom:10px;"></div>

              <!-- Save / Remove buttons -->
              <div style="display:flex; gap:8px; margin-top:10px;">
                <button onclick="window.audioConfigPlugin.saveZoneOutput(${zone.id})"
                        style="flex:1; padding:8px 12px; background:#4caf50; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                  💾 Save
                </button>
                <button onclick="window.audioConfigPlugin.removeZoneOutput(${zone.id})"
                        style="padding:8px 12px; background:#f44336; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                  🗑️ Remove
                </button>
              </div>

              <div id="zone-status-${zone.id}" style="margin-top:8px; font-size:12px;"></div>
            </div>
          `;
        }).join('');

        // Render dynamic fields for zones that already have a transport
        // Attach current transport data to DOM for pre-filling fields
        zones.forEach(zone => {
          const currentTransport = (zone.transports || [])[0] || null;
          const card = document.getElementById(`zone-card-${zone.id}`);
          if (card && currentTransport) card.__currentTransport = currentTransport;
          this.renderTypeFields(zone.id);
        });

      } catch (err) {
        console.error('Zone load error:', err);
        list.innerHTML = `<div class="error">Error loading zones: ${err.message}</div>`;
      }
    },

    /** Return display label for a transport type id */
    _labelForType(typeId) {
      if (!typeId) return 'None';
      const def = (this._transportDefs || []).find(t => t.id === typeId);
      return def ? def.label : typeId;
    },

    /** Render the type-specific config fields for a zone */
    renderTypeFields(zoneId) {
      const select = document.getElementById(`zone-type-${zoneId}`);
      const container = document.getElementById(`zone-fields-${zoneId}`);
      if (!select || !container) return;

      const typeId = select.value;
      if (!typeId) {
        container.innerHTML = '';
        return;
      }

      const def = (this._transportDefs || []).find(t => t.id === typeId);
      if (!def || !def.fields || def.fields.length === 0) {
        container.innerHTML = '<div style="color:#999; font-size:12px; padding:4px 0;">No additional configuration needed.</div>';
        return;
      }

      // Retrieve current values from zone config (if any)
      const card = document.getElementById(`zone-card-${zoneId}`);
      const currentData = card?.__currentTransport || {};

      container.innerHTML = def.fields.map(field => {
        const currentVal = (currentData.id === typeId ? currentData[field.id] : '') || '';
        return `
          <div style="margin-bottom:8px;">
            <label style="display:block; font-size:12px; font-weight:600; color:#555; margin-bottom:2px;">
              ${field.label}${field.required ? ' <span style="color:#f44336;">*</span>' : ''}
            </label>
            ${this._renderFieldInput(zoneId, field, currentVal)}
            ${field.description ? `<div style="font-size:11px; color:#999; margin-top:2px;">${field.description}</div>` : ''}
          </div>
        `;
      }).join('');
    },

    /** Render a single field input – supports text and a special "alsa-device" selector */
    _renderFieldInput(zoneId, field, currentVal) {
      const inputId = `zone-field-${zoneId}-${field.id}`;
      // Plain text field
      return `<input type="text" id="${inputId}" value="${this._escAttr(currentVal)}"
                placeholder="${this._escAttr(field.placeholder || '')}"
                style="width:100%; padding:6px 8px; border:1px solid #ddd; border-radius:4px; box-sizing:border-box;" />`;
    },

    _escAttr(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },

    /** Save zone output config via POST /admin/api/zones/:id/output */
    async saveZoneOutput(zoneId) {
      const statusEl = document.getElementById(`zone-status-${zoneId}`);
      const select = document.getElementById(`zone-type-${zoneId}`);
      const typeId = select?.value;

      if (!typeId) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#f44336;">Please select an output type first.</span>';
        return;
      }

      // Gather field values
      const def = (this._transportDefs || []).find(t => t.id === typeId);
      const body = { type: typeId };
      if (def && def.fields) {
        for (const field of def.fields) {
          const input = document.getElementById(`zone-field-${zoneId}-${field.id}`);
          if (input) body[field.id] = input.value;
        }
      }

      if (statusEl) statusEl.innerHTML = '<span style="color:#667eea;">Saving...</span>';

      try {
        const res = await fetch(`/admin/api/zones/${zoneId}/output`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Save failed');
        }
        if (statusEl) statusEl.innerHTML = '<span style="color:#4caf50;">✓ Saved! Restart server to apply changes.</span>';
      } catch (err) {
        console.error('Save zone output error:', err);
        if (statusEl) statusEl.innerHTML = `<span style="color:#f44336;">✗ ${err.message}</span>`;
      }
    },

    /** Remove all transports from a zone */
    async removeZoneOutput(zoneId) {
      if (!confirm(`Remove output from Zone ${zoneId}?`)) return;
      const statusEl = document.getElementById(`zone-status-${zoneId}`);
      if (statusEl) statusEl.innerHTML = '<span style="color:#667eea;">Removing...</span>';

      try {
        const res = await fetch(`/admin/api/zones/${zoneId}/output`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Delete failed');
        if (statusEl) statusEl.innerHTML = '<span style="color:#4caf50;">✓ Output removed.</span>';
        // Reload after short delay
        setTimeout(() => this.loadZones(), 800);
      } catch (err) {
        console.error('Remove zone output error:', err);
        if (statusEl) statusEl.innerHTML = `<span style="color:#f44336;">✗ ${err.message}</span>`;
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
              <p style="margin: 10px 0;"><strong>Initialized:</strong> <span style="color: ${data.initialized ? '#4caf50' : '#f44336'}; font-weight: 600;">${data.initialized ? '✓ Yes' : '✗ No'}</span></p>
              <p style="margin: 10px 0;"><strong>Relay State:</strong> <span style="color: ${data.relayState === 'on' ? '#4caf50' : '#999'}; font-weight: 600;">${(data.relayState || 'unknown').toUpperCase()}</span></p>
              <p style="margin: 10px 0;"><strong>Port:</strong> <span style="font-family: monospace;">${data.port}</span></p>
              <p style="margin: 10px 0;"><strong>Channel:</strong> ${data.channel}</p>
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
          if (port.product) {
            label += ` - ${port.product}`;
          }
          if (port.isRelay) {
            label += ' ⚡ RELAY';
          }
          const isCurrent = port.path === data.current;
          return `<option value="${port.path}" ${isCurrent ? 'selected' : ''}>${label}${isCurrent ? ' (Active)' : ''}</option>`;
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
      try {
        const response = await fetch('/admin/api/powermanager/on', { method: 'POST' });
        if (response.ok) {
          alert('✓ Relay turned ON!');
          this.loadPowerStatus();
        } else {
          const err = await response.json();
          alert('✗ Failed: ' + (err.message || 'Unknown error'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    },

    async powerOff() {
      try {
        const response = await fetch('/admin/api/powermanager/off', { method: 'POST' });
        if (response.ok) {
          alert('✓ Relay turned OFF!');
          this.loadPowerStatus();
        } else {
          const err = await response.json();
          alert('✗ Failed: ' + (err.message || 'Unknown error'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
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
