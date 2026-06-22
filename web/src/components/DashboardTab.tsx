'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Files, Database, Network, Activity, Terminal, Copy, Check } from 'lucide-react';

interface DashboardTabProps {
  documents: any[];
  endpoints: any[];
  logs: any[];
  onTabChange: (tab: string) => void;
}

export default function DashboardTab({ documents, endpoints, logs, onTabChange }: DashboardTabProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Compute stats
  const totalDocs = documents.length;
  const processedDocs = documents.filter(d => d.status === 'COMPLETED').length;
  const activeApis = endpoints.length;
  const totalCalls = logs.length;
  
  // Approximate total chunks
  // In a real application, sum chunks length. Here, let's estimate based on documents or mock seed chunks
  const totalChunks = documents.reduce((acc, doc) => {
    // If completed, estimate about 1 chunk per 4KB, or default 15
    return acc + (doc.status === 'COMPLETED' ? Math.max(3, Math.floor(doc.size / 1000)) : 0);
  }, 0);

  // Growth mock data for charts
  const growthData = [
    { name: 'Mon', chunks: totalChunks > 5 ? Math.floor(totalChunks * 0.3) : 2 },
    { name: 'Tue', chunks: totalChunks > 5 ? Math.floor(totalChunks * 0.45) : 3 },
    { name: 'Wed', chunks: totalChunks > 5 ? Math.floor(totalChunks * 0.6) : 4 },
    { name: 'Thu', chunks: totalChunks > 5 ? Math.floor(totalChunks * 0.8) : 5 },
    { name: 'Fri', chunks: totalChunks },
  ];

  // Latency data from logs or standard mock
  const latencyData = logs.length > 0 
    ? logs.slice(0, 10).reverse().map((log, idx) => ({
        name: `req-${idx+1}`,
        latency: log.latencyMs,
      }))
    : [
        { name: 'req-1', latency: 120 },
        { name: 'req-2', latency: 250 },
        { name: 'req-3', latency: 85 },
        { name: 'req-4', latency: 190 },
        { name: 'req-5', latency: 140 },
      ];

  const handleCopy = (path: string, id: string) => {
    const fullUrl = `http://localhost:4000/api/apis/gateway/sk_live_demo123456789${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Overview</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Analytics, documents index, and dynamic API configurations.
        </p>
      </div>

      {/* Grid of 4 Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: 'Total Documents', value: totalDocs, icon: Files, color: 'text-indigo-400', desc: `${processedDocs} processed successfully` },
          { title: 'Knowledge Chunks', value: totalChunks, icon: Database, color: 'text-purple-400', desc: 'Vector database embeddings' },
          { title: 'Active APIs', value: activeApis, icon: Terminal, color: 'text-pink-400', desc: 'Queryable developer endpoints' },
          { title: 'Queries Executed', value: totalCalls, icon: Activity, color: 'text-emerald-400', desc: 'API gateway logs captured' },
        ].map((card, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
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

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Knowledge Growth */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            Knowledge Growth (Vectors)
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorChunks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f0f14', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#a855f7' }}
                />
                <Area type="monotone" dataKey="chunks" stroke="#a855f7" fillOpacity={1} fill="url(#colorChunks)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: API Gateway Latency */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            API Latency Response (ms)
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f0f14', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="latency" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Generated APIs Quick View */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            Active Generated Endpoints
          </h3>
          <button 
            onClick={() => onTabChange('apis')}
            className="text-xs text-indigo-400 hover:underline font-semibold"
          >
            Manage APIs
          </button>
        </div>

        {endpoints.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No endpoints generated yet. Upload documents to automatically build APIs.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[250px] overflow-y-auto pr-2">
            {endpoints.slice(0, 5).map((ep) => (
              <div key={ep.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {ep.method}
                    </span>
                    <code className="text-indigo-300 font-mono text-xs">{ep.path}</code>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{ep.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[120px] hidden md:block">
                    {ep.document?.name}
                  </span>
                  <button
                    onClick={() => handleCopy(ep.path, ep.id)}
                    className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                  >
                    {copiedId === ep.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
