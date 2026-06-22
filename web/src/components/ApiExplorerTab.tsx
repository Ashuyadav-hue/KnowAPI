'use client';

import React, { useState } from 'react';
import { apiRequest } from '../lib/api';
import { Terminal, Copy, Check, Play, FileJson, Clock, Server, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ApiExplorerTabProps {
  endpoints: any[];
  logs: any[];
  onRefreshLogs: () => void;
}

export default function ApiExplorerTab({ endpoints, logs, onRefreshLogs }: ApiExplorerTabProps) {
  const [selectedEpId, setSelectedEpId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [responseJson, setResponseJson] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTestKey, setActiveTestKey] = useState('sk_live_demo123456789');

  const selectedEp = endpoints.find(ep => ep.id === selectedEpId) || endpoints[0];

  // Set default selection
  React.useEffect(() => {
    if (endpoints.length > 0 && !selectedEpId) {
      setSelectedEpId(endpoints[0].id);
    }
  }, [endpoints]);

  const handleCopyUrl = (path: string, id: string) => {
    const fullUrl = `http://localhost:4000/api/apis/gateway/${activeTestKey}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestCall = async () => {
    if (!selectedEp) return;
    setExecuting(true);
    setResponseJson(null);

    try {
      const data = await apiRequest(`/apis/test/${selectedEp.id}`, 'POST');
      setResponseJson(data);
      onRefreshLogs();
    } catch (err: any) {
      setResponseJson({
        error: 'API Execution Failed',
        message: err.message,
      });
    } finally {
      setExecuting(false);
    }
  };

  const formatJson = (jsonObj: any) => {
    return JSON.stringify(jsonObj, null, 2);
  };

  // Filter logs for this specific endpoint's latency chart
  const epLogs = selectedEp 
    ? logs
        .filter(l => l.endpointId === selectedEp.id)
        .slice(0, 10)
        .reverse()
        .map((log, idx) => ({
          name: `req-${idx+1}`,
          latency: log.latencyMs,
        }))
    : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">API Engine Gateway</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Test, inspect, and copy live REST API endpoints automatically built from your documents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoint Selector Sidebar */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Generated Endpoints</h3>
          <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
            {endpoints.map((ep) => (
              <div
                key={ep.id}
                onClick={() => {
                  setSelectedEpId(ep.id);
                  setResponseJson(null);
                }}
                className={`p-3 rounded-lg text-xs cursor-pointer transition-colors border ${
                  selectedEp?.id === ep.id
                    ? 'bg-indigo-600/10 border-indigo-500 text-white font-semibold'
                    : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {ep.method}
                  </span>
                  <code className="text-indigo-300 font-mono">{ep.path}</code>
                </div>
                <p className="line-clamp-2 text-slate-500 font-medium leading-relaxed">{ep.description}</p>
              </div>
            ))}

            {endpoints.length === 0 && (
              <div className="text-center text-xs text-slate-500 py-12">
                No endpoints generated yet.
              </div>
            )}
          </div>
        </div>

        {/* Playground Area */}
        {selectedEp ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Endpoint Inspector */}
            <div className="glass-card p-6 rounded-2xl space-y-4 border border-white/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {selectedEp.method}
                    </span>
                    <h2 className="text-lg font-bold text-white font-mono">{selectedEp.path}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">{selectedEp.description}</p>
                </div>
                <button
                  onClick={() => handleCopyUrl(selectedEp.path, selectedEp.id)}
                  className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedId === selectedEp.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied Endpoint
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Gateway URL
                    </>
                  )}
                </button>
              </div>

              {/* Endpoint configuration panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5 text-xs">
                <div className="p-3 bg-black/30 border border-white/5 rounded-lg">
                  <span className="text-slate-500 font-semibold block uppercase mb-1">API Authentication</span>
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Passed via header: <code className="text-indigo-400">x-api-key</code>
                  </div>
                </div>
                <div className="p-3 bg-black/30 border border-white/5 rounded-lg">
                  <span className="text-slate-500 font-semibold block uppercase mb-1">Gateway Host</span>
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <code className="text-indigo-400">http://localhost:4000/api</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Playground Sandbox */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Request Panel */}
              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-white/5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <FileJson className="w-4 h-4 text-indigo-400" />
                    Response Schema Structure
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">Expected JSON return fields:</p>
                  <pre className="bg-black/50 p-4 rounded-lg border border-white/5 font-mono text-xs text-indigo-300 overflow-x-auto">
                    {formatJson(JSON.parse(selectedEp.responseSchema || '{}'))}
                  </pre>
                </div>

                <button
                  onClick={handleTestCall}
                  disabled={executing}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
                >
                  {executing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Execute Request Console
                    </>
                  )}
                </button>
              </div>

              {/* Response Panel */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                <div className="flex-1 flex flex-col justify-start">
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Response Output JSON
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">Console log outputs:</p>
                  {responseJson ? (
                    <pre className="bg-black/50 p-4 rounded-lg border border-white/5 font-mono text-xs text-emerald-300 overflow-auto max-h-[220px] flex-1 leading-relaxed">
                      {formatJson(responseJson)}
                    </pre>
                  ) : (
                    <div className="bg-black/20 p-8 rounded-lg border border-white/5 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
                      Execute call to inspect actual output payload.
                    </div>
                  )}
                </div>

                {epLogs.length > 0 && (
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Endpoint Latency Telemetry (ms)
                    </span>
                    <div className="h-[60px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={epLogs}>
                          <Area type="monotone" dataKey="latency" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 glass-card p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
            <Terminal className="w-8 h-8 text-slate-600" />
            <h3 className="text-lg font-bold text-white">No APIs active</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Please upload document notes or guidelines to automatically extract content and create structured APIs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
