import React, { useEffect, useState } from 'react';
import { Save, Database, Radio } from 'lucide-react';
import { toast } from '../../store/toastStore.js';

const SETTINGS_KEY = 'transitiq_operator_prefs';

const DEFAULT_PREFS = {
  telemetryInterval: 3000,
  gpsLossTimeout: 15,
  debounceInterval: 5,
  cityFocus: 'Karachi, Pakistan',
};

const loadPrefs = () => {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_PREFS;
  }
};

export const AdminSettingsPage = () => {
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const update = (key) => (e) =>
    setPrefs((p) => ({ ...p, [key]: key === 'cityFocus' ? e.target.value : Number(e.target.value) }));

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs));
    toast.success('Operator preferences saved to this workstation.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-syne font-bold text-2xl sm:text-3xl text-white">
          Platform Configuration & Parameters
        </h1>
        <p className="text-xs font-mono text-text-muted mt-1">
          Telemetry timing thresholds, failover parameters, and Pakistan localization
        </p>
      </div>

      <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSave} className="space-y-6 font-mono text-xs">
          {/* Timing Parameters */}
          <div>
            <h3 className="font-syne font-bold text-sm text-accent-blue flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4" />
              <span>Real-Time Engine Telemetry</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-muted uppercase mb-1">
                  GPS Telemetry Emission Rate (ms)
                </label>
                <input
                  type="number"
                  step="500"
                  value={prefs.telemetryInterval}
                  onChange={update('telemetryInterval')}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
                />
                <span className="text-[10px] text-text-muted mt-0.5 block">Default: 3000ms (3 seconds)</span>
              </div>

              <div>
                <label className="block text-text-muted uppercase mb-1">
                  GPS Loss Detection Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={prefs.gpsLossTimeout}
                  onChange={update('gpsLossTimeout')}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-accent-blue focus:outline-none"
                />
                <span className="text-[10px] text-text-muted mt-0.5 block">Trigger "GPS Lost" if no ping for &gt; 15s</span>
              </div>
            </div>
          </div>

          {/* Database Debouncing */}
          <div className="border-t border-border-subtle/50 pt-5">
            <h3 className="font-syne font-bold text-sm text-status-green flex items-center gap-2 mb-3">
              <Database className="w-4 h-4" />
              <span>Data Persistence & Optimization</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-muted uppercase mb-1">
                  Database Location Debounce (seconds)
                </label>
                <input
                  type="number"
                  value={prefs.debounceInterval}
                  onChange={update('debounceInterval')}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:border-status-green focus:outline-none"
                />
                <span className="text-[10px] text-text-muted mt-0.5 block">Debounces location write to MongoDB every 5s</span>
              </div>

              <div>
                <label className="block text-text-muted uppercase mb-1">
                  Primary Geographic Focus
                </label>
                <input
                  type="text"
                  value={prefs.cityFocus}
                  onChange={update('cityFocus')}
                  className="w-full bg-surface-alt text-white p-2.5 rounded-lg border border-border-subtle focus:outline-none"
                />
                <span className="text-[10px] text-text-muted mt-0.5 block">Default map center & coordinates region</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="py-3 px-6 bg-accent-blue hover:bg-accent-blue/90 text-background font-syne font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-accent-blue/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
