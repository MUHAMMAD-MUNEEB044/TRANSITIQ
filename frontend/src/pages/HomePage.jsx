import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, Zap, ArrowRight, Radio, Activity, Clock, ShieldCheck, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RouteSearchBar from '../components/RouteSearchBar.jsx';
import RouteResultCard from '../components/RouteResultCard.jsx';
import TransferRouteDisplay from '../components/TransferRouteDisplay.jsx';
import CrowdBadge from '../components/CrowdBadge.jsx';
import { useRouteStore } from '../store/routeStore.js';
import { useBusStore } from '../store/busStore.js';
import { useFavoriteStore } from '../store/favoriteStore.js';
import { useAuthStore } from '../store/authStore.js';
import { toast } from '../store/toastStore.js';
import api from '../services/api.js';

const FEATURES = [
  {
    icon: Radio,
    titleKey: 'Live GPS Telemetry',
    text: 'Watch vehicles move in real time with sub-second position updates streamed over WebSockets.',
  },
  {
    icon: Clock,
    titleKey: 'Dynamic ETAs',
    text: 'Arrival forecasts that recalculate continuously from live speed, heading and reported delays.',
  },
  {
    icon: Zap,
    titleKey: 'Smart Transfers',
    text: 'One search finds direct corridors and one-transfer connections through shared interchange stops.',
  },
  {
    icon: ShieldCheck,
    titleKey: 'Service Alerts',
    text: 'Delays, stop closures and operator broadcasts delivered the moment they are published.',
  },
];

export const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { routes, fetchRoutes, searchRoutes, searchResults, searchLoading } = useRouteStore();
  const { buses, fetchBuses } = useBusStore();
  const { isAuthenticated } = useAuthStore();
  const { favorites, fetchFavorites, toggleFavorite } = useFavoriteStore();
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchRoutes();
    fetchBuses();
    fetchFavorites();

    const loadStats = async () => {
      try {
        const res = await api.get('/analytics/overview');
        setAnalyticsOverview(res.data.data);
      } catch (e) {
        setAnalyticsOverview(null);
      }
    };
    loadStats();
  }, [fetchRoutes, fetchBuses, fetchFavorites]);

  const handleSearch = async (params) => {
    setHasSearched(true);
    await searchRoutes(params);
  };

  const busOnRoute = (routeId) =>
    buses.find((b) => b.currentRoute === routeId || b.currentRoute?._id === routeId);

  const handleToggleFavorite = async (routeId) => {
    const result = await toggleFavorite(routeId);
    if (result === 'added') toast.success('Route added to My Routes.');
    else if (result === 'removed') toast.info('Route removed from My Routes.');
    else if (result === 'error') toast.error('Could not update favorites.');
  };

  // Favorite routes first, then everything else
  const orderedRoutes = useMemo(() => {
    const favSet = new Set(favorites);
    return [...routes].sort(
      (a, b) => (favSet.has(b._id) ? 1 : 0) - (favSet.has(a._id) ? 1 : 0)
    );
  }, [routes, favorites]);

  const favoriteRoutes = useMemo(
    () => routes.filter((r) => favorites.includes(r._id)),
    [routes, favorites]
  );

  const activeNow = buses.filter((b) => b.status === 'on_route' || b.status === 'delayed').length;
  const fleetLoading = buses.length === 0;

  const RouteCard = ({ r }) => {
    const live = busOnRoute(r._id);
    const crowd = live ? useBusStore.getState().liveLocations[live._id]?.crowdLevel : null;
    const isFav = favorites.includes(r._id);
    return (
      <div className="glass-card group p-5 transition-all duration-300 hover:border-accent-blue/40 hover:-translate-y-0.5 flex flex-col justify-between relative overflow-hidden">
        {/* Route color spine */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: r.colorCode || '#38BDF8' }}
          aria-hidden="true"
        />

        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full shadow-lg"
                  style={{ backgroundColor: r.colorCode || '#38BDF8', boxShadow: `0 0 10px ${r.colorCode || '#38BDF8'}66` }}
                />
                <h3 className="font-syne font-bold text-lg text-white">{r.routeName}</h3>
              </div>
              <span className="text-xs font-mono text-text-muted">
                {r.totalDistance} km • ~{r.estimatedDuration} mins trip
              </span>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {live ? (
                <span className="px-2.5 py-1 rounded-full bg-status-green/15 text-status-green text-xs font-mono border border-status-green/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" />
                  <span>LIVE</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-surface-alt text-text-muted text-xs font-mono border border-border-subtle">
                  {t('home.atRest')}
                </span>
              )}
              <CrowdBadge level={crowd} />
            </div>
          </div>

          <div className="bg-surface-alt/60 rounded-xl p-3 mb-4 text-xs font-mono border border-border-subtle/50 space-y-1.5">
            <div className="text-text-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent-blue shrink-0" />
              <span className="text-white font-medium truncate">{r.startLocation}</span>
            </div>
            <div className="text-text-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-status-green shrink-0" />
              <span className="text-white font-medium truncate">{r.destination}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/track/${r._id}`)} className="btn-primary flex-1">
            <Radio className="w-4 h-4" />
            <span>{t('home.trackLive')}</span>
          </button>
          <button
            onClick={() => handleToggleFavorite(r._id)}
            className={`p-2.5 rounded-xl border transition-all ${
              isFav
                ? 'bg-status-yellow/15 border-status-yellow/40 text-status-yellow'
                : 'bg-surface-alt border-border-subtle text-text-muted hover:text-status-yellow hover:border-status-yellow/40'
            }`}
            title={isFav ? 'Remove from My Routes' : 'Add to My Routes'}
            aria-label={isFav ? 'Remove from My Routes' : 'Add to My Routes'}
          >
            <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
          </button>
          <button onClick={() => navigate('/routes')} className="btn-ghost px-4" title="View route stops">
            {t('home.stops')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Hero Section — centered across full viewport width */}
      <div className="relative w-full flex justify-center mb-14">
        <div className="relative w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative text-center max-w-3xl mx-auto">
            <div className="absolute inset-0 -top-16 bg-aurora pointer-events-none" aria-hidden="true" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono mb-4">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>{t('home.badge')}</span>
              </div>

              <h1 className="font-syne font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight mb-4">
                {t('home.title1')}{' '}
                <span className="gradient-text">{t('home.title2')}</span>
              </h1>

              <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-8 max-w-xl mx-auto">
                {t('home.subtitle')}
              </p>

              <div className="max-w-2xl mx-auto">
                <RouteSearchBar onSearch={handleSearch} loading={searchLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Telemetry Stat Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-14">
          <div className="glass-card p-4 hover:border-accent-blue/30 transition-colors">
            <span className="text-[10px] font-mono text-text-muted uppercase block">{t('home.activeFleet')}</span>
            {fleetLoading ? (
              <div className="skeleton h-7 w-20 mt-2" />
            ) : (
              <div className="text-xl sm:text-2xl font-mono font-bold text-accent-blue mt-1.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-green animate-pulse" />
                <span>{activeNow} / {buses.length}</span>
              </div>
            )}
          </div>

          <div className="glass-card p-4 hover:border-accent-blue/30 transition-colors">
            <span className="text-[10px] font-mono text-text-muted uppercase block">{t('home.liveCorridors')}</span>
            {routes.length === 0 ? (
              <div className="skeleton h-7 w-16 mt-2" />
            ) : (
              <div className="text-xl sm:text-2xl font-mono font-bold text-text-primary mt-1.5">
                {routes.length} {t('home.lines')}
              </div>
            )}
          </div>

          <div className="glass-card p-4 hover:border-accent-blue/30 transition-colors">
            <span className="text-[10px] font-mono text-text-muted uppercase block">{t('home.avgDelay')}</span>
            {analyticsOverview ? (
              <div className="text-xl sm:text-2xl font-mono font-bold text-status-yellow mt-1.5">
                {analyticsOverview.avgDelay ?? '—'} {t('home.min')}
              </div>
            ) : (
              <div className="skeleton h-7 w-16 mt-2" />
            )}
          </div>

          <div className="glass-card p-4 hover:border-accent-blue/30 transition-colors">
            <span className="text-[10px] font-mono text-text-muted uppercase block">{t('home.activeAlerts')}</span>
            {analyticsOverview ? (
              <div className="text-xl sm:text-2xl font-mono font-bold text-status-red mt-1.5">
                {analyticsOverview.activeAlerts ?? 0}
              </div>
            ) : (
              <div className="skeleton h-7 w-16 mt-2" />
            )}
          </div>
        </div>

        {/* Search Results Section */}
        {hasSearched && (
          <section className="mb-14 animate-fade-in">
            <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
              <h2 className="font-syne font-bold text-xl text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent-blue" />
                <span>Search Results</span>
              </h2>
              <span className="text-xs font-mono text-text-muted">
                {searchResults.directRoutes.length} Direct • {searchResults.transferRoutes.length} Transfer
              </span>
            </div>

            {searchResults.directRoutes.length === 0 && searchResults.transferRoutes.length === 0 ? (
              <div className="glass-card p-8 text-center text-text-muted">
                <Bus className="w-10 h-10 mx-auto text-text-muted/50 mb-3" />
                <p className="font-medium text-white mb-1">No direct service found for this query</p>
                <p className="text-xs font-mono max-w-sm mx-auto">
                  Try searching for main hubs such as "City Center", "Saddar", "Cantt Station", or "University Gate".
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {searchResults.directRoutes.length > 0 && (
                  <div>
                    <h3 className="text-xs font-mono uppercase text-accent-blue tracking-wider font-semibold mb-3">
                      DIRECT TRANSIT CORRIDORS
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.directRoutes.map((res, idx) => (
                        <RouteResultCard key={idx} result={res} />
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.transferRoutes.length > 0 && (
                  <TransferRouteDisplay transfers={searchResults.transferRoutes} />
                )}
              </div>
            )}
          </section>
        )}

        {/* My Routes — favorited corridors for signed-in users */}
        {isAuthenticated && favoriteRoutes.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-5 h-5 text-status-yellow fill-current" />
              <h2 className="font-syne font-bold text-2xl text-white">{t('home.myRoutes')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {favoriteRoutes.map((r) => (
                <RouteCard key={`fav-${r._id}`} r={r} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Corridors */}
        <section className="mb-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-syne font-bold text-2xl text-white">{t('home.corridors')}</h2>
              <p className="text-xs font-mono text-text-muted mt-1">{t('home.corridorsSub')}</p>
            </div>
            <button
              onClick={() => navigate('/routes')}
              className="text-xs font-mono text-accent-blue hover:underline flex items-center gap-1 shrink-0"
            >
              <span>{t('home.viewAll')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {routes.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="skeleton h-56" />
              <div className="skeleton h-56" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orderedRoutes.map((r) => (
                <RouteCard key={r._id} r={r} />
              ))}
            </div>
          )}
        </section>

        {/* Feature Highlights */}
        <section className="mb-6">
          <h2 className="font-syne font-bold text-2xl text-white mb-6 text-center">
            {t('home.builtFor')} <span className="gradient-text">{t('home.modernTransit')}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.titleKey} className="glass-card p-5 hover:border-accent-purple/40 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-accent-blue" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1.5">{f.titleKey}</h3>
                  <p className="text-xs text-text-muted leading-relaxed">{f.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
