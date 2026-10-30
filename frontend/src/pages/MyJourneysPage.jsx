import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route as RouteIcon, Clock, MapPin, Trash2, ArrowRight, CalendarDays } from 'lucide-react';
import { getJourneys, clearJourneys, formatDuration } from '../services/journeyStore.js';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { toast } from '../store/toastStore.js';

export const MyJourneysPage = () => {
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState(getJourneys());
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClear = () => {
    clearJourneys();
    setJourneys([]);
    setConfirmClear(false);
    toast.info('Journey history cleared.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue text-xs font-mono mb-2">
            <CalendarDays className="w-3 h-3" />
            <span>PASSENGER TRAVEL LOG</span>
          </div>
          <h1 className="font-syne font-bold text-3xl text-white">My Journeys</h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Rides recorded when you follow a live route for 2 minutes or more
          </p>
        </div>

        {journeys.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="btn-ghost text-status-red hover:border-status-red/40 self-start"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </button>
        )}
      </div>

      {journeys.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <RouteIcon className="w-10 h-10 mx-auto text-text-muted/50 mb-3" />
          <p className="font-medium text-white mb-1">No journeys recorded yet</p>
          <p className="text-xs font-mono text-text-muted max-w-sm mx-auto mb-6">
            Open a live route from the homepage and stay a couple of minutes — your ride will appear here automatically.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Explore Routes
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4">
          {/* Timeline spine */}
          <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-border-subtle" aria-hidden="true" />

          {journeys.map((j) => (
            <div key={j.id} className="relative">
              {/* Timeline node */}
              <div
                className="absolute -left-6 top-5 w-4 h-4 rounded-full border-2 border-accent-blue bg-surface shadow-md shadow-accent-blue/20"
                style={{ borderColor: j.colorCode || '#38BDF8' }}
              />
              <button
                onClick={() => j.routeId && navigate(`/track/${j.routeId}`)}
                className="w-full text-left glass-card p-4 hover:border-accent-blue/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: j.colorCode || '#38BDF8' }}
                      />
                      <span className="font-syne font-bold text-sm text-white truncate">
                        {j.routeName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-text-muted">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(j.date).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(j.durationSec)} followed
                      </span>
                      {j.stopsSeen > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {j.stopsSeen} stops visible
                        </span>
                      )}
                      {j.busNumber && <span className="text-accent-blue">{j.busNumber}</span>}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-blue transition-colors shrink-0 mt-1" />
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmClear}
        title="Clear journey history?"
        message="All recorded journeys will be permanently removed from this device."
        confirmLabel="Clear All"
        danger
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
};

export default MyJourneysPage;
