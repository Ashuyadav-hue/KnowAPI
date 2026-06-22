'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { MessageSquare, Send, Plus, Trash2, BookOpen, Quote, Sparkles } from 'lucide-react';

interface ChatTabProps {
  documents: any[];
  chatSessions: any[];
  activeSessionId: string | null;
  onRefreshSessions: (setActiveId?: string) => void;
  onSessionSelect: (id: string) => void;
}

export default function ChatTab({
  documents,
  chatSessions,
  activeSessionId,
  onRefreshSessions,
  onSessionSelect,
}: ChatTabProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<{ fileName: string; text: string } | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Load messages whenever active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadSessionMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  const loadSessionMessages = async (id: string) => {
    try {
      const data = await apiRequest(`/chat/sessions/${id}`);
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || !activeSessionId || loading) return;

    setLoading(true);
    if (!textToSend) setInput('');

    // Append user message locally immediately for instant visual response
    const tempUserMsg = { id: Math.random().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const result = await apiRequest(`/chat/sessions/${activeSessionId}/message`, 'POST', { message: text });
      // Replace or update messages with the actual DB saved messages
      await loadSessionMessages(activeSessionId);
    } catch (err: any) {
      alert(`Message failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    try {
      const data = await apiRequest('/chat/sessions', 'POST', { title: '' });
      onRefreshSessions(data.id);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this chat history?')) return;

    try {
      await apiRequest(`/chat/sessions/${id}`, 'DELETE');
      if (activeSessionId === id) {
        onRefreshSessions();
      } else {
        onRefreshSessions(activeSessionId || undefined);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
  };

  const parseCitations = (citationsStr?: string | null): any[] => {
    if (!citationsStr) return [];
    try {
      return JSON.parse(citationsStr);
    } catch {
      return [];
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-220px)] animate-fade-in">
      {/* Sessions Sidebar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col justify-between h-full border border-white/5">
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chat History</h3>
            <button
              onClick={handleNewSession}
              className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          <div className="space-y-1">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  activeSessionId === session.id
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span className="truncate">{session.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/50 hover:text-red-400 text-slate-500 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {chatSessions.length === 0 && (
              <div className="text-center text-xs text-slate-500 py-8">
                No active conversations.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="lg:col-span-3 glass-card rounded-2xl flex flex-col justify-between h-full relative overflow-hidden border border-white/5">
        {/* Chat Messages Panel */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin"
        >
          {activeSessionId ? (
            messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
                <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Ask your knowledge operating system</h3>
                <p className="text-xs text-slate-500">
                  Ask about your notes, compare SQL methods, fetch hooks syntax, or request a summary.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                const citations = parseCitations(msg.citations);
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-600/10'
                          : 'bg-white/5 border border-white/5 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      {/* Message Content */}
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                      {/* Source Citations */}
                      {!isUser && citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Sources:
                          </span>
                          {citations.map((c, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveCitation(c)}
                              className="text-[10px] bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Quote className="w-2.5 h-2.5" />
                              {c.fileName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
              <MessageSquare className="w-8 h-8 text-slate-600" />
              <h3 className="text-lg font-bold text-white">No active chat session</h3>
              <p className="text-xs text-slate-500">
                Select an existing conversation from the history panel or click "New" to start a new chat.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/5 text-slate-200 p-4 rounded-2xl rounded-bl-none flex items-center gap-2 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-100"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-200"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-300"></span>
                </div>
                Assessing documents...
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        {activeSessionId && messages.length === 0 && (
          <div className="px-6 py-3 border-t border-white/5 flex flex-wrap gap-2">
            {[
              'Explain React Hooks from my notes.',
              'Summarize all SQL documents.',
              'Explain useState hook syntax.',
              'Compare SQL joins and types.',
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(p)}
                className="text-xs bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 text-slate-300 px-3 py-1.5 rounded-full transition-all cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Area */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex items-center gap-3">
          <input
            type="text"
            placeholder={activeSessionId ? "Ask a question about your knowledge..." : "Select or start a chat session..."}
            disabled={!activeSessionId || loading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!activeSessionId || !input.trim() || loading}
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Citation Detail Slide-in Modal */}
        {activeCitation && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card max-w-lg w-full p-6 rounded-2xl relative">
              <h4 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {activeCitation.fileName} Source Chunk
              </h4>
              <p className="text-xs text-slate-400 font-semibold mb-3">Matching vector search context snippet:</p>
              <div className="bg-black/50 p-4 rounded-lg border border-white/5 max-h-[250px] overflow-y-auto text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                "{activeCitation.text}"
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setActiveCitation(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close Citation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
