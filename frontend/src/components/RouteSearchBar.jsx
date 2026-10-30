import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpDown, Search, MapPin, Navigation2 } from 'lucide-react';
import api from '../services/api.js';

export const RouteSearchBar = ({ onSearch, initialFrom = '', initialTo = '', loading = false }) => {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [stopSuggestions, setStopSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null); // 'from' | 'to' | null

  const dropdownRef = useRef(null);

  // Fetch stops for autocomplete
  useEffect(() => {
    const fetchStops = async () => {
      try {
        const res = await api.get('/stops');
        if (res.data?.data) {
          setStopSuggestions(res.data.data.map((s) => s.stopName));
        }
      } catch (err) {
        console.warn('Failed to load stop autocomplete:', err.message);
      }
    };
    fetchStops();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveInput(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (from.trim() || to.trim()) {
      setActiveInput(null);
      onSearch({ from: from.trim(), to: to.trim() });
    }
  };

  const getFilteredSuggestions = (query) => {
    if (!query) return stopSuggestions.slice(0, 5);
    return stopSuggestions
      .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  };

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <form
        onSubmit={handleSubmit}
        className="bg-surface/90 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-border-subtle shadow-2xl flex flex-col md:flex-row items-stretch md:items-center gap-3 transition-all duration-300 hover:border-accent-blue/40"
      >
        {/* From Input */}
        <div className="flex-1 relative">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface-alt rounded-lg border border-border-subtle focus-within:border-accent-blue focus-within:ring-1 focus-within:ring-accent-blue/30 transition-all">
            <MapPin className="w-4 h-4 text-accent-blue shrink-0" />
            <input
              type="text"
              id="search-from-input"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setActiveInput('from');
              }}
              onFocus={() => setActiveInput('from')}
              placeholder="Origin stop (e.g. City Center Tower)"
              className="bg-transparent text-sm w-full text-text-primary placeholder:text-text-muted focus:outline-none"
              autoComplete="off"
            />
          </div>

          {/* Autocomplete Dropdown for From */}
          {activeInput === 'from' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-alt border border-border-subtle rounded-lg shadow-2xl z-[70] overflow-y-auto max-h-[240px]">
              {getFilteredSuggestions(from).map((stopName, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setFrom(stopName);
                    setActiveInput(null);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-text-primary hover:bg-accent-blue/20 hover:text-accent-blue flex items-center gap-2 border-b border-border-subtle/40 last:border-none"
                >
                  <MapPin className="w-3.5 h-3.5 text-accent-blue shrink-0" />
                  <span>{stopName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button — cyan accent + hover tooltip */}
        <div className="self-center relative group">
          <button
            type="button"
            onClick={handleSwap}
            id="btn-swap-stops"
            className="p-2.5 rounded-lg bg-surface-alt hover:bg-accent-cyan/20 text-text-muted hover:text-accent-cyan border-2 border-accent-cyan/50 hover:border-accent-cyan shadow-md shadow-accent-cyan/10 transition-all duration-200 active:rotate-180"
            aria-label="Swap stops"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
          <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 rounded-md bg-surface border border-border-subtle text-[10px] font-mono text-text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[70] shadow-lg">
            Swap stops
          </span>
        </div>

        {/* To Input */}
        <div className="flex-1 relative">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface-alt rounded-lg border border-border-subtle focus-within:border-accent-blue focus-within:ring-1 focus-within:ring-accent-blue/30 transition-all">
            <Navigation2 className="w-4 h-4 text-status-green shrink-0" />
            <input
              type="text"
              id="search-to-input"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setActiveInput('to');
              }}
              onFocus={() => setActiveInput('to')}
              placeholder="Destination stop (e.g. University Gate)"
              className="bg-transparent text-sm w-full text-text-primary placeholder:text-text-muted focus:outline-none"
              autoComplete="off"
            />
          </div>

          {/* Autocomplete Dropdown for To */}
          {activeInput === 'to' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-alt border border-border-subtle rounded-lg shadow-2xl z-[70] overflow-y-auto max-h-[240px]">
              {getFilteredSuggestions(to).map((stopName, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTo(stopName);
                    setActiveInput(null);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-text-primary hover:bg-status-green/20 hover:text-status-green flex items-center gap-2 border-b border-border-subtle/40 last:border-none"
                >
                  <MapPin className="w-3.5 h-3.5 text-status-green shrink-0" />
                  <span>{stopName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Find Route Button */}
        <button
          type="submit"
          id="btn-find-route"
          disabled={loading}
          className="px-6 py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-background font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>Find Route</span>
        </button>
      </form>
    </div>
  );
};

export default RouteSearchBar;
