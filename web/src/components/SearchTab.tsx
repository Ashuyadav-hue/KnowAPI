'use client';

import React, { useState } from 'react';
import { apiRequest } from '../lib/api';
import { Search, Sparkles, FileText, Database, Filter } from 'lucide-react';

interface SearchTabProps {
  documents: any[];
  onTabChange: (tab: string, context?: any) => void;
}

export default function SearchTab({ documents, onTabChange }: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'semantic' | 'keyword'>('semantic');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDocId, setFilterDocId] = useState('all');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const data = await apiRequest(`/documents/search/query?query=${encodeURIComponent(query)}&type=${searchType}`);
      setResults(data || []);
    } catch (err: any) {
      alert(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5 border border-yellow-500/20">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const filteredResults = results.filter(r => {
    if (filterDocId === 'all') return true;
    return r.documentId === filterDocId;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Global Search Portal</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Run high-accuracy AI Semantic Search or standard Keyword Search across your entire second brain.
        </p>
      </div>

      {/* Search Console */}
      <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="What would you like to search for? (e.g. explain useState rules...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Query Database
              </>
            )}
          </button>
        </form>

        {/* Options Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-white/5 text-xs font-semibold">
          {/* Search Type Toggles */}
          <div className="flex items-center gap-3">
            <span className="text-slate-500 uppercase tracking-wider">Search Type:</span>
            <div className="flex bg-white/5 border border-white/10 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setSearchType('semantic')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                  searchType === 'semantic'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Semantic
              </button>
              <button
                type="button"
                onClick={() => setSearchType('keyword')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                  searchType === 'keyword'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Exact Keyword
              </button>
            </div>
          </div>

          {/* Document Context Filters */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter By Document:
            </span>
            <select
              value={filterDocId}
              onChange={(e) => setFilterDocId(e.target.value)}
              className="bg-white/5 border border-white/10 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Documents</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Container */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Search Results ({filteredResults.length})</h3>

        {loading ? (
          <div className="glass-card p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            Searching vector layers...
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-500 text-sm">
            {query ? 'No matching chunks found. Try another query or type.' : 'Query above to display matching content blocks.'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResults.map((r, i) => (
              <div key={i} className="glass-card p-5 rounded-2xl border border-white/5 space-y-3 hover:border-indigo-500/20 transition-all group">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    {r.documentName}
                  </div>
                  {searchType === 'semantic' && r.score && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold">
                      Match: {Math.round(r.score * 100)}%
                    </span>
                  )}
                </div>

                <div className="bg-black/30 p-4 rounded-lg border border-white/5 text-sm text-slate-300 leading-relaxed font-medium">
                  {highlightText(r.content, query)}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onTabChange('chat', { docId: r.documentId })}
                    className="text-xs text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Open in AI Chat →
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
