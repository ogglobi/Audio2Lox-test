<!-- Audio Configuration UI Component Example -->
<!-- This is a reference implementation for the Admin UI -->
<!-- Can be adapted for Vue, React, or vanilla JS -->

<template>
  <div class="audio-configuration">
    <!-- Navigation Tabs -->
    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'devices' }]"
        @click="activeTab = 'devices'"
      >
        🎵 Audio Devices
      </button>
      <button
        :class="['tab', { active: activeTab === 'zones' }]"
        @click="activeTab = 'zones'"
      >
        📍 Zone Mapping
      </button>
      <button
        :class="['tab', { active: activeTab === 'power' }]"
        @click="activeTab = 'power'"
      >
        ⚡ Power Management
      </button>
    </div>

    <!-- Audio Devices Tab -->
    <div v-show="activeTab === 'devices'" class="tab-content">
      <h2>Audio Devices</h2>

      <div v-if="loading.devices" class="loading">
        <span>Loading audio devices...</span>
      </div>

      <div v-if="error.devices" class="error">
        {{ error.devices }}
      </div>

      <div v-if="!loading.devices && !error.devices" class="device-list">
        <div
          v-for="device in audioDevices"
          :key="device.id"
          class="device-card"
        >
          <div class="device-header">
            <h3>{{ device.longName }}</h3>
            <span class="device-id">{{ device.id }}</span>
          </div>

          <div class="device-details">
            <p><strong>Card ID:</strong> {{ device.cardId }}</p>
            <p><strong>Driver:</strong> {{ device.driver || 'N/A' }}</p>
            <p><strong>Channels:</strong> {{ device.channels.length }}</p>
          </div>

          <div class="channels">
            <div
              v-for="channel in device.channels"
              :key="channel.id"
              class="channel"
            >
              <span class="channel-name">{{ channel.name }}</span>
              <span class="channel-direction" :data-direction="channel.direction">
                {{ channel.direction }}
              </span>
              <span class="channel-id">{{ channel.id }}</span>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" @click="refreshAudioDevices">
          🔄 Refresh Devices
        </button>
      </div>
    </div>

    <!-- Zone Mapping Tab -->
    <div v-show="activeTab === 'zones'" class="tab-content">
      <h2>Zone Audio Output Configuration</h2>

      <div v-if="loading.zones" class="loading">
        <span>Loading zones...</span>
      </div>

      <div v-if="error.zones" class="error">
        {{ error.zones }}
      </div>

      <div v-if="!loading.zones && !error.zones" class="zone-mapper">
        <div
          v-for="zone in availableZones"
          :key="zone.id"
          class="zone-config"
        >
          <div class="zone-header">
            <h3>{{ zone.name }}</h3>
            <span class="zone-id">Zone #{{ zone.id }}</span>
          </div>

          <div class="config-section">
            <label>Output Type</label>
            <select
              v-model="zoneConfigs[zone.id].outputType"
              @change="onOutputTypeChange(zone.id)"
            >
              <option value="">-- Select Output Type --</option>
              <option value="squeezelite">Squeezelite / SlimProto</option>
              <option value="airplay">AirPlay</option>
              <option value="dlna">DLNA</option>
              <option value="snapcast">Snapcast</option>
            </select>
          </div>

          <!-- Squeezelite Output Config -->
          <div
            v-if="zoneConfigs[zone.id].outputType === 'squeezelite'"
            class="config-section"
          >
            <label>Player Selection</label>
            <div class="radio-group">
              <label>
                <input
                  type="radio"
                  v-model="zoneConfigs[zone.id].playerSelectionMode"
                  value="id"
                />
                By MAC Address
              </label>
              <input
                v-if="zoneConfigs[zone.id].playerSelectionMode === 'id'"
                v-model="zoneConfigs[zone.id].playerId"
                type="text"
                placeholder="aa:bb:cc:dd:ee:ff"
                class="input-field"
              />
            </div>

            <div class="radio-group">
              <label>
                <input
                  type="radio"
                  v-model="zoneConfigs[zone.id].playerSelectionMode"
                  value="name"
                />
                By Player Name
              </label>
              <select
                v-if="zoneConfigs[zone.id].playerSelectionMode === 'name'"
                v-model="zoneConfigs[zone.id].playerName"
                class="input-field"
              >
                <option value="">-- Select Player --</option>
                <option
                  v-for="player in availablePlayers"
                  :key="player.id"
                  :value="player.name"
                >
                  {{ player.name }} ({{ player.id }})
                </option>
              </select>
            </div>

            <div class="config-actions">
              <button
                class="btn btn-secondary"
                @click="loadZoneOutput(zone.id)"
              >
                📂 Load from Device
              </button>
              <button
                class="btn btn-primary"
                @click="saveZoneOutput(zone.id)"
              >
                💾 Save
              </button>
            </div>
          </div>

          <!-- Info Messages -->
          <div
            v-if="zone.output"
            class="info-box"
          >
            <strong>Current Output:</strong>
            {{ zone.output.id }}
            <span v-if="zone.output.playerName">({{ zone.output.playerName }})</span>
          </div>

          <hr class="zone-separator" />
        </div>

        <!-- Players Refresh -->
        <button class="btn btn-primary" @click="refreshSqueezelitePlayers">
          🔄 Refresh Players
        </button>
      </div>
    </div>

    <!-- Power Management Tab -->
    <div v-show="activeTab === 'power'" class="tab-content">
      <h2>Power Management</h2>

      <div v-if="powerManagerStatus" class="power-status">
        <div class="status-card">
          <h3>PowerManager Status</h3>
          <div class="status-info">
            <p>
              <strong>Status:</strong>
              <span :class="powerManagerStatus.enabled ? 'status-enabled' : 'status-disabled'">
                {{ powerManagerStatus.enabled ? '✓ Enabled' : '✗ Disabled' }}
              </span>
            </p>
            <p v-if="powerManagerStatus.usbPort">
              <strong>USB Port:</strong> {{ powerManagerStatus.usbPort }}
            </p>
            <p v-if="powerManagerStatus.baudRate">
              <strong>Baud Rate:</strong> {{ powerManagerStatus.baudRate }}
            </p>
            <p>
              <strong>Current State:</strong>
              <span :class="powerManagerStatus.currentState === 'On' ? 'status-on' : 'status-off'">
                {{ powerManagerStatus.currentState }}
              </span>
            </p>
            <p v-if="powerManagerStatus.lastAction">
              <strong>Last Action:</strong> {{ powerManagerStatus.lastAction }}
            </p>
          </div>

          <div class="control-buttons">
            <button
              class="btn btn-warning"
              @click="testPowerManager"
              :disabled="!powerManagerStatus.enabled"
            >
              🔌 Test Relay
            </button>
            <button
              class="btn btn-success"
              @click="turnPowerOn"
              :disabled="!powerManagerStatus.enabled"
            >
              ⚡ Turn On
            </button>
            <button
              class="btn btn-danger"
              @click="turnPowerOff"
              :disabled="!powerManagerStatus.enabled"
            >
              🔌 Turn Off
            </button>
          </div>

          <div v-if="powerManagerStatus.lastActionTime" class="last-action">
            <small>Last update: {{ powerManagerStatus.lastActionTime }}</small>
          </div>
        </div>
      </div>

      <div v-if="!powerManagerStatus" class="info-box">
        PowerManager is not configured or not available.
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AudioConfiguration',
  data() {
    return {
      activeTab: 'devices',
      audioDevices: [],
      availablePlayers: [],
      availableZones: [],
      zoneConfigs: {},
      powerManagerStatus: null,
      loading: {
        devices: false,
        zones: false,
      },
      error: {
        devices: null,
        zones: null,
      },
    };
  },

  mounted() {
    this.loadAudioDevices();
    this.loadZones();
    this.loadPowerManagerStatus();
  },

  methods: {
    async loadAudioDevices() {
      this.loading.devices = true;
      this.error.devices = null;
      try {
        const response = await fetch('/admin/api/audio/devices');
        const data = await response.json();
        this.audioDevices = data.devices || [];
        await this.loadSqueezelitePlayers();
      } catch (err) {
        this.error.devices = `Failed to load audio devices: ${err.message}`;
      } finally {
        this.loading.devices = false;
      }
    },

    async refreshAudioDevices() {
      await this.loadAudioDevices();
    },

    async loadSqueezelitePlayers() {
      try {
        const response = await fetch('/admin/api/audio/squeezelite/players');
        const data = await response.json();
        this.availablePlayers = data.players || [];
      } catch (err) {
        console.warn('Failed to load Squeezelite players:', err);
      }
    },

    async refreshSqueezelitePlayers() {
      await this.loadSqueezelitePlayers();
    },

    async loadZones() {
      this.loading.zones = true;
      this.error.zones = null;
      try {
        // In a real app, zones would come from the config API
        // For now, we assume zones are loaded from the main app state
        const response = await fetch('/admin/api/config');
        const config = await response.json();
        this.availableZones = config.zones || [];

        // Load output config for each zone
        for (const zone of this.availableZones) {
          await this.loadZoneOutput(zone.id);
        }
      } catch (err) {
        this.error.zones = `Failed to load zones: ${err.message}`;
      } finally {
        this.loading.zones = false;
      }
    },

    async loadZoneOutput(zoneId) {
      try {
        const response = await fetch(`/admin/api/zones/${zoneId}/output`);
        const data = await response.json();

        if (!this.zoneConfigs[zoneId]) {
          this.$set(this.zoneConfigs, zoneId, {});
        }

        const config = this.zoneConfigs[zoneId];
        config.outputType = data.output?.id || '';
        config.playerId = data.output?.playerId || '';
        config.playerName = data.output?.playerName || '';
        config.playerSelectionMode = data.output?.playerName ? 'name' : 'id';
      } catch (err) {
        console.warn(`Failed to load zone output for zone ${zoneId}:`, err);
      }
    },

    async saveZoneOutput(zoneId) {
      try {
        const config = this.zoneConfigs[zoneId];
        const outputConfig = {
          id: config.outputType,
        };

        if (config.outputType === 'squeezelite') {
          if (config.playerSelectionMode === 'id') {
            outputConfig.playerId = config.playerId;
          } else {
            outputConfig.playerName = config.playerName;
          }
        }

        const response = await fetch(`/admin/api/zones/${zoneId}/output`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ output: outputConfig }),
        });

        if (!response.ok) {
          throw new Error('Failed to save zone output');
        }

        alert(`Zone ${zoneId} configuration saved successfully!`);
        await this.loadZones();
      } catch (err) {
        alert(`Error saving zone configuration: ${err.message}`);
      }
    },

    onOutputTypeChange(zoneId) {
      // Reset player selection when output type changes
      if (!this.zoneConfigs[zoneId]) {
        this.$set(this.zoneConfigs, zoneId, {});
      }
      this.zoneConfigs[zoneId].playerId = '';
      this.zoneConfigs[zoneId].playerName = '';
      this.zoneConfigs[zoneId].playerSelectionMode = 'id';
    },

    async loadPowerManagerStatus() {
      try {
        // This would normally come from a dedicated API endpoint
        // For now, we assume it's part of the config
        const response = await fetch('/admin/api/config');
        const config = await response.json();
        this.powerManagerStatus = config.powerManager || null;
      } catch (err) {
        console.warn('Failed to load PowerManager status:', err);
      }
    },

    async testPowerManager() {
      if (!confirm('Are you sure you want to test the relay? This will send a short pulse.')) {
        return;
      }

      try {
        const response = await fetch('/admin/api/powermanager/test', {
          method: 'POST',
        });
        const data = await response.json();
        alert('PowerManager test triggered!');
        this.powerManagerStatus.lastAction = 'Test Pulse';
        this.powerManagerStatus.lastActionTime = new Date().toLocaleTimeString();
      } catch (err) {
        alert(`PowerManager test failed: ${err.message}`);
      }
    },

    async turnPowerOn() {
      // Implementation for turning power on
      alert('Power On command would be sent here');
    },

    async turnPowerOff() {
      // Implementation for turning power off
      alert('Power Off command would be sent here');
    },
  },
};
</script>

<style scoped>
.audio-configuration {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #ddd;
}

.tab {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.tab:hover {
  background: #f0f0f0;
}

.tab.active {
  border-bottom-color: #0066cc;
  color: #0066cc;
}

.tab-content {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tab-content h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  background: #fee;
  color: #c00;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.info-box {
  background: #efe;
  color: #060;
  padding: 12px;
  border-radius: 4px;
  margin: 12px 0;
  border-left: 4px solid #060;
}

/* Device List */
.device-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.device-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: #f9f9f9;
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.device-header h3 {
  margin: 0;
  font-size: 18px;
}

.device-id {
  background: #e0e0e0;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.device-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin: 10px 0;
}

.device-details p {
  margin: 5px 0;
  font-size: 14px;
}

.channels {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.channel {
  background: white;
  padding: 8px 12px;
  border-left: 3px solid #0066cc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.channel-name {
  font-weight: 500;
}

.channel-direction {
  background: #e6f2ff;
  color: #0066cc;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.channel-direction[data-direction="capture"] {
  background: #ffe6e6;
  color: #cc0000;
}

.channel-id {
  font-family: monospace;
  color: #666;
  font-size: 12px;
}

/* Zone Mapper */
.zone-mapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.zone-config {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: #f9f9f9;
}

.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.zone-header h3 {
  margin: 0;
  font-size: 18px;
}

.zone-id {
  background: #e0e0e0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.config-section {
  margin: 15px 0;
}

.config-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.config-section select,
.input-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 10px 0;
}

.radio-group label {
  display: flex;
  align-items: center;
  font-weight: normal;
  margin-bottom: 0;
}

.radio-group input[type="radio"] {
  margin-right: 8px;
}

.radio-group input[type="text"],
.radio-group select {
  margin-left: 28px;
  margin-top: 5px;
  width: calc(100% - 28px);
}

.config-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.zone-separator {
  margin: 15px 0;
  border: none;
  border-top: 1px solid #ddd;
}

/* Power Status */
.power-status {
  display: flex;
  gap: 20px;
}

.status-card {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: #f9f9f9;
}

.status-card h3 {
  margin-top: 0;
}

.status-info p {
  margin: 10px 0;
  display: flex;
  justify-content: space-between;
}

.status-info strong {
  min-width: 150px;
}

.status-enabled {
  color: #060;
  font-weight: 500;
}

.status-disabled {
  color: #c00;
  font-weight: 500;
}

.status-on {
  color: #060;
  font-weight: 500;
}

.status-off {
  color: #c00;
  font-weight: 500;
}

.control-buttons {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.last-action {
  margin-top: 10px;
  color: #666;
  text-align: right;
}

/* Buttons */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 100px;
}

.btn-primary {
  background: #0066cc;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0052a3;
}

.btn-secondary {
  background: #666;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #555;
}

.btn-success {
  background: #060;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #050;
}

.btn-danger {
  background: #c00;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #a00;
}

.btn-warning {
  background: #f90;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #e80;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .device-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .device-details {
    grid-template-columns: 1fr;
  }

  .config-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
