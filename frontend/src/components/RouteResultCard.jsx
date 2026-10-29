import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Clock, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

export const RouteResultCard = ({ result }) => {
  const navigate = useNavigate();
  const { route, bus, nextStop, etaMinutes = 5, distanceKm, status = 'ON TIME' } = result;

  const handleTrackBus = () => {
    navigate(`/track/${route._id}`);
  };

  return (
    <div className="bg-surface hover:bg-surface-alt/70 border border-border-subtle hover:border-accent-blue/40 rounded-xl p-4 sm:p-5 transition-all duration-300 shadow-lg flex flex-col justify-between group">
      <div>
        {/* Header: Route Name & Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: route.colorCode || '#38BDF8' }}
              />
              <h3 className="font-syne font-bold text-base text-text-primary group-hover:text-accent-blue transition-colors">
                {route.routeName}
              </h3>
            </div>
            <div className="text-xs text-text-muted flex items-center gap-1.5 font-mono">
              <Bus className="w-3.5 h-3.5 text-accent-blue" />
              <span>Bus ID: {bus?.busNumber || 'PK-BUS-101'}</span>
              <span>•</span>
              <span>{bus?.vehicleNumber || 'KHI-7892'}</span>
            </div>
          </div>

          <StatusBadge status={status} isSimulated={bus?.isSimulated} />
        </div>

        {/* Origin to Destination Corridor */}
        <div className="bg-surface-alt/50 rounded-lg p-2.5 mb-4 border border-border-subtle/50 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
            <span className="text-text-muted truncate">{route.startLocation}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0 mx-2" />
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-status-green" />
            <span className="text-text-primary font-medium truncate">{route.destination}</span>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-mono">
          <div className="bg-background/60 p-2.5 rounded-lg border border-border-subtle/40">
            <span className="text-text-muted block text-[11px] mb-0.5">NEXT STOP</span>
            <div className="text-text-primary font-semibold truncate flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-status-yellow shrink-0" />
              <span className="truncate">{nextStop || 'Next Stop'}</span>
            </div>
          </div>

          <div className="bg-background/60 p-2.5 rounded-lg border border-border-subtle/40">
            <span className="text-text-muted block text-[11px] mb-0.5">ESTIMATED ARRIVAL</span>
            <div className="text-status-green font-bold text-sm flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{etaMinutes} mins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleTrackBus}
        id={`btn-track-route-${route._id}`}
        className="w-full py-2.5 px-4 bg-accent-blue/15 hover:bg-accent-blue text-accent-blue hover:text-background font-semibold text-xs rounded-lg flex items-center justify-center gap-2 border border-accent-blue/30 hover:border-accent-blue transition-all duration-200 shadow-sm"
      >
        <Bus className="w-4 h-4" />
        <span>Track This Bus Live</span>
        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
      </button>
    </div>
  );
};

export default RouteResultCard;
