'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import AuthPage from '../components/AuthPage';
import DashboardTab from '../components/DashboardTab';
import DocumentsTab from '../components/DocumentsTab';
import ChatTab from '../components/ChatTab';
import ApiExplorerTab from '../components/ApiExplorerTab';
import KnowledgeGraphTab from '../components/KnowledgeGraphTab';
import SearchTab from '../components/SearchTab';
import AnalyticsTab from '../components/AnalyticsTab';
import SettingsTab from '../components/SettingsTab';
import { 
  Shield, 
  LayoutDashboard, 
  Files, 
  MessageSquare, 
  Terminal, 
  Network, 
  Search, 
  Activity, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  User 
} from 'lucide-react';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLightMode, setIsLightMode] = useState(false);

  // Core synchronized lists
  const [documents, setDocuments] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  
  const [loadingSync, setLoadingSync] = useState(false);

  // Load token on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Sync data when token changes
  useEffect(() => {
    if (token) {
      syncAllData();
      // Setup polling every 4 seconds to fetch file processing state changes automatically!
      const interval = setInterval(syncDocumentsAndLogs, 4000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const syncAllData = async () => {
    if (loadingSync) return;
    setLoadingSync(true);
    try {
      await Promise.all([
        syncDocumentsAndLogs(),
        syncSessionsAndKeys(),
      ]);
    } catch (err) {
      console.error('Initial sync failed:', err);
    } finally {
      setLoadingSync(false);
    }
  };

  const syncDocumentsAndLogs = async () => {
    try {
      const docsData = await apiRequest('/documents');
      setDocuments(docsData || []);

      const endpointsData = await apiRequest('/apis');
      setEndpoints(endpointsData || []);

      const logsData = await apiRequest('/apis/logs');
      setLogs(logsData || []);
    } catch (err) {
      console.error('Telemetry sync failed:', err);
    }
  };

  const syncSessionsAndKeys = async () => {
    try {
      const sessionsData = await apiRequest('/chat/sessions');
      setChatSessions(sessionsData || []);
      
      // Auto select first session if none selected
      if (sessionsData && sessionsData.length > 0 && !activeSessionId) {
        setActiveSessionId(sessionsData[0].id);
      }

      const keysData = await apiRequest('/auth/keys');
      setApiKeys(keysData || []);
    } catch (err) {
      console.error('Session credentials sync failed:', err);
    }
  };

  const handleAuthSuccess = (newToken: string, authUser: any) => {
    setToken(newToken);
    setUser(authUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setActiveSessionId(null);
  };

  // Helper for custom tab switches with parameters (e.g. Chat with document ID)
  const handleTabSwitch = async (tab: string, context?: any) => {
    setActiveTab(tab);
    if (tab === 'chat' && context?.docId) {
      // Find or create a session named after this document focus
      const matchedDoc = documents.find(d => d.id === context.docId);
      const title = matchedDoc ? `Chat: ${matchedDoc.name}` : 'Document Focus Chat';
      
      try {
        const newSession = await apiRequest('/chat/sessions', 'POST', { title });
        await syncSessionsAndKeys();
        setActiveSessionId(newSession.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isLightMode) {
      html.classList.remove('light');
      setIsLightMode(false);
    } else {
      html.classList.add('light');
      setIsLightMode(true);
    }
  };

  // Check if authenticated
  if (!token) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  // Sidebar navigation mapping
  const sidebarItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', name: 'Documents', icon: Files },
    { id: 'chat', name: 'AI Chat', icon: MessageSquare },
    { id: 'apis', name: 'Generated APIs', icon: Terminal },
    { id: 'graph', name: 'Knowledge Graph', icon: Network },
    { id: 'search', name: 'Advanced Search', icon: Search },
    { id: 'analytics', name: 'Analytics', icon: Activity },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="relative min-h-screen flex bg-[#070709] text-slate-200 overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Grid Wrapper */}
      <div className="relative z-10 w-full flex flex-col md:flex-row">
        
        {/* Sidebar Shell */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-black/40 backdrop-blur-md flex flex-col justify-between shrink-0">
          <div>
            {/* Header Brand */}
            <div className="p-6 border-b border-white/5 flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-400" />
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                KnowledgeAPI
              </span>
            </div>

            {/* Nav Menu */}
            <nav className="p-4 space-y-1">
              {sidebarItems.map((item) => {
                const IsActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabSwitch(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer font-medium ${
                      IsActive
                        ? 'bg-indigo-600 text-white shadow shadow-indigo-600/10'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${IsActive ? 'text-white' : 'text-indigo-400/80 group-hover:text-white'}`} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Account panel */}
          <div className="p-4 border-t border-white/5 bg-black/20 space-y-3">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'User'}
                  className="w-9 h-9 rounded-full border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <User className="w-4.5 h-4.5" />
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-red-900/25 hover:text-red-400 hover:border-red-500/10 border border-transparent text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Content Shell */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          
          {/* Shell Topbar */}
          <header className="h-16 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-end px-6 gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
            >
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className="h-4 w-px bg-white/10"></div>
            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/5 px-2.5 py-1.5 rounded-full border border-emerald-500/10">
              Demo Active
            </span>
          </header>

          {/* Main Tabs Container */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-black/10">
            {activeTab === 'dashboard' && (
              <DashboardTab 
                documents={documents} 
                endpoints={endpoints} 
                logs={logs} 
                onTabChange={handleTabSwitch} 
              />
            )}
            {activeTab === 'documents' && (
              <DocumentsTab 
                documents={documents} 
                onRefresh={syncDocumentsAndLogs} 
                onTabChange={handleTabSwitch} 
              />
            )}
            {activeTab === 'chat' && (
              <ChatTab 
                documents={documents} 
                chatSessions={chatSessions} 
                activeSessionId={activeSessionId}
                onRefreshSessions={syncSessionsAndKeys}
                onSessionSelect={setActiveSessionId}
              />
            )}
            {activeTab === 'apis' && (
              <ApiExplorerTab 
                endpoints={endpoints} 
                logs={logs} 
                onRefreshLogs={syncDocumentsAndLogs} 
              />
            )}
            {activeTab === 'graph' && <KnowledgeGraphTab />}
            {activeTab === 'search' && (
              <SearchTab 
                documents={documents} 
                onTabChange={handleTabSwitch} 
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsTab 
                endpoints={endpoints} 
                logs={logs} 
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab 
                user={user} 
                apiKeys={apiKeys} 
                onRefreshKeys={syncSessionsAndKeys} 
                onUserUpdate={setUser} 
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
