'use client';

import React, { useState, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { UploadCloud, FileText, Trash2, Edit2, Play, MessageSquare, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DocumentsTabProps {
  documents: any[];
  onRefresh: () => void;
  onTabChange: (tab: string, context?: any) => void;
}

export default function DocumentsTab({ documents, onRefresh, onTabChange }: DocumentsTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        await apiRequest('/documents/upload', 'POST', formData, true);
      }
      onRefresh();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!renameName.trim()) return;
    try {
      await apiRequest(`/documents/${id}/rename`, 'PATCH', { name: renameName });
      setRenameId(null);
      onRefresh();
    } catch (err: any) {
      alert(`Rename failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? All chunks, graph concepts, and generated APIs will be permanently deleted.')) return;
    try {
      await apiRequest(`/documents/${id}`, 'DELETE');
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Group files by type (as folder folders simulation)
  const categories = {
    all: 'All Documents',
    pdf: 'PDF Documents',
    word: 'Word Documents',
    text: 'Markdown & Text',
  };

  const filteredDocs = documents.filter(doc => {
    if (filterFolder === 'pdf') return doc.mimeType === 'application/pdf';
    if (filterFolder === 'word') return doc.mimeType.includes('word') || doc.name.endsWith('.docx');
    if (filterFolder === 'text') return doc.mimeType.includes('text') || doc.name.endsWith('.md') || doc.name.endsWith('.txt');
    return true;
  });

  // Helper for rendering step animations
  const renderStatus = (status: string, errorMsg?: string | null) => {
    switch (status) {
      case 'UPLOADING':
        return (
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Uploading File...
          </div>
        );
      case 'PROCESSING':
        return (
          <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Extracting Content...
          </div>
        );
      case 'EMBEDDING':
        return (
          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium animate-pulse">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-100"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-200"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-300"></span>
            </div>
            Embedding Chunks...
          </div>
        );
      case 'GENERATING_APIS':
        return (
          <div className="flex items-center gap-1.5 text-xs text-pink-400 font-medium animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
            Generating APIs...
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold" title={errorMsg || ''}>
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </div>
        );
      default:
        return <span className="text-xs text-slate-500 font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Document Vault</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Upload notes, research, or specifications to dynamically generate intelligent vector embeddings and APIs.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync State
        </button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`glass-card p-10 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-white/10 hover:border-white/25 hover:bg-white/5'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          multiple
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
        />
        <div className="p-4 rounded-full bg-white/5 border border-white/10 text-indigo-400 mb-4 animate-bounce">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          {uploading ? 'Uploading Files...' : 'Drag & drop document files'}
        </h3>
        <p className="text-xs text-slate-500 max-w-[280px]">
          Supports PDF, Word (DOCX), Text, or Markdown files. Large files will be auto-chunked.
        </p>
      </div>

      {/* Folder Filters & Main List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folders Sidebar */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Categories</p>
          {Object.entries(categories).map(([key, name]) => (
            <button
              key={key}
              onClick={() => setFilterFolder(key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                filterFolder === key
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Files Listing */}
        <div className="lg:col-span-3 glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Uploaded Files</h3>

          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No files found in this category. Upload a document to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Name</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-3.5 pl-2 font-medium text-white flex items-center gap-2 max-w-[220px] md:max-w-xs">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        {renameId === doc.id ? (
                          <input
                            type="text"
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            onBlur={() => handleRename(doc.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(doc.id)}
                            className="bg-black/50 border border-indigo-500 text-white px-2 py-0.5 rounded text-sm focus:outline-none w-full"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate" title={doc.name}>
                            {doc.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-slate-400 font-medium">
                        {(doc.size / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3.5">
                        {renderStatus(doc.status, doc.error)}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          {doc.status === 'COMPLETED' && (
                            <>
                              <button
                                onClick={() => onTabChange('chat', { docId: doc.id })}
                                title="Chat with knowledge"
                                className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer text-slate-300"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onTabChange('apis')}
                                title="Test API endpoints"
                                className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer text-slate-300"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setRenameId(doc.id);
                              setRenameName(doc.name);
                            }}
                            title="Rename"
                            className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            title="Delete"
                            className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-red-900/50 hover:text-red-400 hover:border-red-500/30 text-slate-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
