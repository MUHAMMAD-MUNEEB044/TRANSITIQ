import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Bus, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export const StopDetailPage = () => {
  const { stopId } = useParams();
  const navigate = useNavigate();

  const [stopData, setStopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStop = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/stops/${stopId}`);
        setStopData(res.data.data);
      } catch (e) {
        setError(
          e.response?.status === 404
            ? 'This stop could not be found. It may have been removed from the network.'
            : 'Failed to load stop details. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchStop();
  }, [stopId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
        <div className="skeleton h-28" />
        <div className="skeleton h-40" />
        <div className="skeleton h-24" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 p-2 rounded-xl bg-surface border border-border-subtle hover:border-accent-blue text-text-muted hover:text-white transition-all mb-6 text-xs font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="glass-card p-10 text-center">
          <MapPin className="w-10 h-10 mx-auto text-status-red mb-3" />
          <h2 className="font-syne font-bold text-xl text-white mb-2">Stop unavailable</h2>
          <p className="text-sm text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const { stop, routes = [], upcomingBuses = [] } = stopData || {};
  const [lng, lat] = stop?.location?.coordinates || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 p-2 rounded-xl bg-surface border border-border-subtle hover:border-accent-blue text-text-muted hover:text-white transition-all mb-6 text-xs font-mono"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Stop Hero Card */}
      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-accent-blue font-bold tracking-wider">
                MUNICIPAL TRANSIT STOP
              </span>
              <h1 className="font-syne font-bold text-2xl text-white">
                {stop?.stopName || 'Stop Details'}
              </h1>
              {lat != null && lng != null && (
                <p className="text-xs font-mono text-text-muted mt-0.5">
                  Coordinates: {Number(lat).toFixed(4)}°N, {Number(lng).toFixed(4)}°E
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-mono text-text-muted block">SERVICED BY</span>
            <span className="font-mono text-lg font-bold text-accent-blue">
              {routes.length} Corridors
            </span>
          </div>
        </div>
      </div>

      {/* Approaching Buses Section */}
      <div className="mb-10">
        <h2 className="font-syne font-bold text-xl text-white mb-4 flex items-center gap-2">
          <Bus className="w-5 h-5 text-accent-blue" />
          <span>Approaching Buses (Live ETA)</span>
        </h2>

        {upcomingBuses.length === 0 ? (
          <div className="glass-card p-8 text-center text-text-muted text-xs font-mono">
            No active buses currently approaching this stop within the next 45 minutes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingBuses.map((busItem, idx) => (
              <div
                key={idx}
                className="glass-card hover:border-accent-blue/40 p-4 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-white">
                        {busItem.busNumber}
                      </span>
                      <p className="text-xs text-text-muted truncate">
                        {busItem.route?.name || 'Corridor Route'}
                      </p>
                    </div>
                    <StatusBadge status={busItem.status} isSimulated={busItem.isSimulated} size="sm" />
                  </div>

                  <div className="bg-background/60 p-2.5 rounded-lg border border-border-subtle/40 mb-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted">DISTANCE</span>
                    <span className="text-white font-bold">{busItem.distanceKm} km away</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-status-green flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{busItem.etaMinutes} mins arrival</span>
                  </div>

                  {busItem.route?.id && (
                    <button
                      onClick={() => navigate(`/track/${busItem.route.id}`)}
                      className="px-3 py-1.5 bg-accent-blue/15 hover:bg-accent-blue text-accent-blue hover:text-background rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1"
                    >
                      <span>Track</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Serviced Routes Grid */}
      <div>
        <h2 className="font-syne font-bold text-xl text-white mb-4">
          Routes Serving This Stop
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {routes.map((r) => (
            <button
              key={r._id}
              onClick={() => navigate(`/track/${r._id}`)}
              className="glass-card hover:border-accent-blue/40 p-4 transition-all flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: r.colorCode || '#38BDF8' }}
                />
                <span className="font-syne font-semibold text-sm text-text-primary group-hover:text-accent-blue transition-colors truncate">
                  {r.routeName}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-blue transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StopDetailPage;
