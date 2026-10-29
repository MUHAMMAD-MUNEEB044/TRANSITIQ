import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Clock,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api.js';

export const AdminAnalyticsPage = () => {
  const [delayTrends, setDelayTrends] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [trendRes, peakRes, overviewRes] = await Promise.all([
          api.get('/analytics/delays/trend'),
          api.get('/analytics/peak-hours'),
          api.get('/analytics/overview'),
        ]);

        setDelayTrends(trendRes.data.data || []);
        setPeakHours(peakRes.data.data || []);
        setOverview(overviewRes.data.data || null);
      } catch (err) {
        console.warn('Analytics loading error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const completionRate = overview?.tripCompletionRate;
  const pieData = completionRate != null
    ? [
        { name: 'Completed Trips', value: completionRate, color: '#34D399' },
        { name: 'Cancelled / Diverted', value: 100 - completionRate, color: '#F87171' },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple text-xs font-mono mb-2">
          <Activity className="w-3.5 h-3.5" />
          <span>NETWORK INTELLIGENCE & TELEMETRIC AGGREGATES</span>
        </div>
        <h1 className="font-syne font-bold text-2xl sm:text-3xl text-white">
          System Analytics & Route Performance
        </h1>
        <p className="text-xs font-mono text-text-muted mt-1">
          Historical puncuality, passenger demand curves, and transit completion metrics
        </p>
      </div>

      {/* Row 1: LineChart & Radial Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LineChart: Avg Delay per Day (Last 30 Days) */}
        <div className="lg:col-span-8 bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-syne font-bold text-base text-white">
                30-Day Average Delay Trend
              </h3>
              <span className="text-[11px] font-mono text-text-muted">
                Mean network delay in minutes over rolling 30-day window
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-status-yellow bg-status-yellow/10 px-2.5 py-1 rounded-lg border border-status-yellow/30">
              <Clock className="w-3.5 h-3.5" />
              <span>Avg: {overview?.avgDelay != null ? `${overview.avgDelay} min` : "—"}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={delayTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 179, 237, 0.08)" />
                <XAxis dataKey="date" stroke="#8899AA" fontSize={10} tickLine={false} />
                <YAxis stroke="#8899AA" fontSize={10} unit="m" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgDelayMinutes"
                  name="Delay (min)"
                  stroke="#FBBF24"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#FBBF24' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trip Completion Rate Pie / Radial */}
        <div className="lg:col-span-4 bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl flex flex-col items-center justify-between text-center">
          <div>
            <h3 className="font-syne font-bold text-base text-white">
              Trip Completion Rate
            </h3>
            <span className="text-[11px] font-mono text-text-muted">
              Punctual & Fulfilled Runs
            </span>
          </div>

          <div className="relative w-48 h-48 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center percentage label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-3xl font-bold text-white">
                {completionRate != null ? `${completionRate}%` : '—'}
              </span>
              <span className="text-[10px] text-status-green">SUCCESS</span>
            </div>
          </div>

          <div className="w-full flex items-center justify-around font-mono text-xs border-t border-border-subtle pt-3">
            <div className="text-status-green font-semibold">
              <span>● Completed ({completionRate != null ? `${completionRate}%` : '—'})</span>
            </div>
            <div className="text-status-red font-semibold">
              <span>● Diverted ({completionRate != null ? `${100 - completionRate}%` : '—'})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Fleet Status BarChart & Peak-Hour AreaChart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BarChart: Live Fleet Status Breakdown */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl">
          <h3 className="font-syne font-bold text-base text-white mb-1">
            Live Fleet Status Breakdown
          </h3>
          <span className="text-[11px] font-mono text-text-muted block mb-4">
            Current vehicle distribution across operating states
          </span>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { state: 'Active', count: overview?.activeNow ?? 0 },
                  { state: 'Delayed', count: overview?.delayed ?? 0 },
                  { state: 'Offline', count: overview?.offline ?? 0 },
                  { state: 'Total Fleet', count: overview?.totalBuses ?? 0 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 179, 237, 0.08)" />
                <XAxis dataKey="state" stroke="#8899AA" fontSize={10} tickLine={false} />
                <YAxis stroke="#8899AA" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Bar dataKey="count" name="Vehicles" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AreaChart: Passenger Activity by Hour (Peak Hours) */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl">
          <h3 className="font-syne font-bold text-base text-white mb-1">
            Passenger Activity by Hour (Peak Hours)
          </h3>
          <span className="text-[11px] font-mono text-text-muted block mb-4">
            Demand density curve across Karachi morning and evening rush hours
          </span>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakHours}>
                <defs>
                  <linearGradient id="passengerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 179, 237, 0.08)" />
                <XAxis dataKey="hour" stroke="#8899AA" fontSize={10} tickLine={false} />
                <YAxis stroke="#8899AA" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="passengers"
                  name="Passengers / Hr"
                  stroke="#818CF8"
                  fillOpacity={1}
                  fill="url(#passengerGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Delay Trend Summary — sourced from live analytics API */}
      <div className="glass-card p-6">
        <h3 className="font-syne font-bold text-base text-white mb-1">
          Network Delay Summary
        </h3>
        <p className="text-xs font-mono text-text-muted mb-4">
          Current network-wide punctuality indicators
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
          <div className="bg-surface-alt/60 rounded-xl p-4 border border-border-subtle/50">
            <span className="text-[10px] text-text-muted uppercase block">AVG DELAY</span>
            <span className="text-xl font-bold text-status-yellow">
              {overview?.avgDelay != null ? `${overview.avgDelay} min` : '—'}
            </span>
          </div>
          <div className="bg-surface-alt/60 rounded-xl p-4 border border-border-subtle/50">
            <span className="text-[10px] text-text-muted uppercase block">TRIPS TODAY</span>
            <span className="text-xl font-bold text-text-primary">
              {overview?.tripsToday ?? '—'}
            </span>
          </div>
          <div className="bg-surface-alt/60 rounded-xl p-4 border border-border-subtle/50">
            <span className="text-[10px] text-text-muted uppercase block">COMPLETION RATE</span>
            <span className="text-xl font-bold text-status-green">
              {overview?.tripCompletionRate != null ? `${overview.tripCompletionRate}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
