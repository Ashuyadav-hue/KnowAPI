'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Activity, Clock, Terminal, PieChart as PieIcon, ShieldAlert } from 'lucide-react';

interface AnalyticsTabProps {
  endpoints: any[];
  logs: any[];
}

export default function AnalyticsTab({ endpoints, logs }: AnalyticsTabProps) {
  // 1. Calculate Latency Metrics
  const totalCalls = logs.length;
  const avgLatency = totalCalls > 0
    ? Math.round(logs.reduce((acc, log) => acc + log.latencyMs, 0) / totalCalls)
    : 0;
  const maxLatency = totalCalls > 0
    ? Math.max(...logs.map(log => log.latencyMs))
    : 0;
  
  const errorCalls = logs.filter(log => log.statusCode >= 400).length;
  const errorRate = totalCalls > 0
    ? ((errorCalls / totalCalls) * 100).toFixed(1)
    : '0.0';

  // 2. Prepare Topic Chart data
  // Extract counts of calls to different endpoint paths
  const pathCounts: Record<string, number> = {};
  logs.forEach(log => {
    const key = log.path;
    pathCounts[key] = (pathCounts[key] || 0) + 1;
  });

  const topicChartData = Object.entries(pathCounts)
    .map(([path, count]) => ({
      name: path.split('/').slice(-1)[0] || path,
      calls: count,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 5);

  // If empty, provide default mock
  const finalTopicData = topicChartData.length > 0 
    ? topicChartData 
    : [
        { name: 'hooks', calls: 18 },
        { name: 'usestate', calls: 14 },
        { name: 'useeffect', calls: 12 },
        { name: 'joins', calls: 9 },
      ];

  // 3. Prepare Categories Pie Chart data
  // Group endpoints by their prefix (react, sql, general, etc.)
  const categoryCounts: Record<string, number> = {};
  endpoints.forEach(ep => {
    const parts = ep.path.split('/').filter(Boolean);
    const cat = parts[0] || 'general';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#10b981'];
  
  const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
  }));

  const finalPieData = pieData.length > 0
    ? pieData
    : [
        { name: 'REACT', value: 3 },
        { name: 'SQL', value: 1 },
      ];

  // 4. Prepare Latency timeline chart
  const timelineData = logs.slice(0, 15).reverse().map((log, idx) => ({
    name: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: log.latencyMs,
  }));

  const finalTimelineData = timelineData.length > 0
    ? timelineData
    : [
        { name: '10:00 AM', latency: 120 },
        { name: '10:15 AM', latency: 230 },
        { name: '10:30 AM', latency: 95 },
        { name: '10:45 AM', latency: 180 },
        { name: '11:00 AM', latency: 140 },
      ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">System Analytics</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Real-time telemetry, query frequencies, categories, and latency benchmarks.
        </p>
      </div>

      {/* Numerical Benchmarks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: 'Average Latency', value: `${avgLatency} ms`, icon: Clock, color: 'text-indigo-400', desc: 'Average Gateway execution' },
          { title: 'Peak Latency', value: `${maxLatency} ms`, icon: Activity, color: 'text-pink-400', desc: 'Slowest response captured' },
          { title: 'Error Rate', value: `${errorRate}%`, icon: ShieldAlert, color: 'text-rose-400', desc: 'Status code 4xx/5xx requests' },
          { title: 'Total API Requests', value: totalCalls, icon: Terminal, color: 'text-emerald-400', desc: 'Total logs recorded' },
        ].map((card, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 font-medium">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency History */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col justify-between border border-white/5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            Gateway Latency Trend (ms)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={finalTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f0f14', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#6366f1' }}
                />
                <Line type="monotone" dataKey="latency" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Split */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-white/5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-1.5">
            <PieIcon className="w-4 h-4 text-purple-400" />
            API Categories Split
          </h3>
          <div className="h-[200px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={finalPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {finalPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f0f14', borderColor: '#333', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] text-slate-400 pt-4 border-t border-white/5 font-semibold">
            {finalPieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latency distribution bar chart */}
      <div className="glass-card p-6 rounded-2xl border border-white/5">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-pink-400" />
          Query Calls Count by Sub-API
        </h3>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={finalTopicData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f0f14', borderColor: '#333', color: '#fff' }}
                itemStyle={{ color: '#ec4899' }}
              />
              <Bar dataKey="calls" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
