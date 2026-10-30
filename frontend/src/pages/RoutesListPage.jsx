import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, Clock, ArrowRight, Search, Activity, Star } from 'lucide-react';
import { useRouteStore } from '../store/routeStore.js';
import { useFavoriteStore } from '../store/favoriteStore.js';
import { toast } from '../store/toastStore.js';

export const RoutesListPage = () => {
  const navigate = useNavigate();
  const { routes, fetchRoutes, loading } = useRouteStore();
  const { favorites, fetchFavorites, toggleFavorite } = useFavoriteStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRoutes();
    fetchFavorites();
  }, [fetchRoutes, fetchFavorites]);

  const handleToggleFavorite = async (routeId) => {
    const result = await toggleFavorite(routeId);
    if (result === 'added') toast.success('Route added to My Routes.');
    else if (result === 'removed') toast.info('Route removed from My Routes.');
    else if (result === 'error') toast.error('Could not update favorites.');
  };

  const term = (searchTerm || '').toLowerCase();
  const filteredRoutes = routes.filter((r) =>
    (r.routeName || '').toLowerCase().includes(term) ||
    (r.startLocation || '').toLowerCase().includes(term) ||
    (r.destination || '').toLowerCase().includes(term)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue text-xs font-mono mb-2">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>PAKISTAN NETWORK CORRIDORS</span>
          </div>
          <h1 className="font-syne font-bold text-3xl text-white">
            Transit Routes
          </h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Browse all active municipal express, BRT, and feeder routes
          </p>
        </div>

        {/* Filter Input */}
        <div className="w-full md:w-80">
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-surface rounded-xl border border-border-subtle focus-within:border-accent-blue transition-all">
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter routes or corridors..."
              className="bg-transparent text-sm w-full text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs font-mono text-text-muted">Loading route network...</span>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="bg-surface p-12 rounded-2xl border border-border-subtle text-center text-text-muted">
          <p className="font-medium text-white mb-1">No matching routes found</p>
          <span className="text-xs font-mono">Try searching with a different landmark or route number.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoutes.map((route) => (
            <div
              key={route._id}
              className="bg-surface hover:bg-surface-alt/70 border border-border-subtle hover:border-accent-blue/40 rounded-2xl p-5 transition-all duration-300 shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: route.colorCode || '#38BDF8' }}
                    />
                    <h3 className="font-syne font-bold text-base text-white group-hover:text-accent-blue transition-colors">
                      {route.routeName}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleToggleFavorite(route._id)}
                    className={`p-1.5 rounded-lg transition-all shrink-0 ${
                      favorites.includes(route._id)
                        ? 'text-status-yellow bg-status-yellow/10'
                        : 'text-text-muted hover:text-status-yellow'
                    }`}
                    title={favorites.includes(route._id) ? 'Remove from My Routes' : 'Add to My Routes'}
                    aria-label={favorites.includes(route._id) ? 'Remove from My Routes' : 'Add to My Routes'}
                  >
                    <Star className={`w-4 h-4 ${favorites.includes(route._id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="bg-surface-alt/60 rounded-xl p-3 mb-4 text-xs font-mono border border-border-subtle/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-accent-blue shrink-0" />
                    <span className="text-white truncate">{route.startLocation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-status-green shrink-0" />
                    <span className="text-white truncate">{route.destination}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4 text-text-muted">
                  <div className="bg-background/60 p-2 rounded-lg border border-border-subtle/30">
                    <span className="text-[10px] block">DISTANCE</span>
                    <span className="text-text-primary font-bold">{route.totalDistance} km</span>
                  </div>
                  <div className="bg-background/60 p-2 rounded-lg border border-border-subtle/30">
                    <span className="text-[10px] block">EST. TRAVEL TIME</span>
                    <span className="text-text-primary font-bold">~{route.estimatedDuration} mins</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/track/${route._id}`)}
                className="w-full py-2.5 bg-accent-blue/15 hover:bg-accent-blue text-accent-blue hover:text-background font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-accent-blue/30 transition-all shadow-sm"
              >
                <Bus className="w-4 h-4" />
                <span>Track Route Live</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoutesListPage;
