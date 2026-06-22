'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { Network, ZoomIn, ZoomOut, Search, Info, HelpCircle } from 'lucide-react';

interface Node {
  id: string;
  name: string;
  description: string;
  documentName: string;
  documentId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Link {
  source: string;
  target: string;
  type: string;
}

export default function KnowledgeGraphTab() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const data = await apiRequest('/graph/concepts');
      initializeLayout(data.nodes || [], data.links || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Run a quick force-directed layout simulation in JS on load
  const initializeLayout = (rawNodes: any[], rawLinks: any[]) => {
    const width = 800;
    const height = 450;

    // 1. Initialize nodes with random positions near center
    const simulatedNodes: Node[] = rawNodes.map((n, idx) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 150,
      y: height / 2 + (Math.random() - 0.5) * 150,
      vx: 0,
      vy: 0,
    }));

    const simulatedLinks: Link[] = rawLinks.map(l => ({
      source: l.source,
      target: l.target,
      type: l.type,
    }));

    // 2. Run simulation ticks
    const ticks = 120;
    const kRepel = 2200; // Repulsion constant
    const kLink = 0.08;   // Link spring tension
    const kGravity = 0.04; // Gravity pulling to center
    const damping = 0.85;  // Velocity retention

    const nodeMap = new Map<string, Node>();
    simulatedNodes.forEach(n => nodeMap.set(n.id, n));

    for (let t = 0; t < ticks; t++) {
      // Repel forces between all pairs of nodes
      for (let i = 0; i < simulatedNodes.length; i++) {
        const nodeA = simulatedNodes[i];
        for (let j = i + 1; j < simulatedNodes.length; j++) {
          const nodeB = simulatedNodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);

          if (dist < 300) {
            // Force magnitude inversely proportional to square distance
            const force = kRepel / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }

      // Link attraction forces along springs
      simulatedLinks.forEach(link => {
        const nodeA = nodeMap.get(link.source);
        const nodeB = nodeMap.get(link.target);
        if (nodeA && nodeB) {
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;

          // Pull nodes together
          const force = (dist - 100) * kLink;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          nodeA.vx += fx;
          nodeA.vy += fy;
          nodeB.vx -= fx;
          nodeB.vy -= fy;
        }
      });

      // Gravity pulling nodes to screen center
      simulatedNodes.forEach(node => {
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        node.vx += dx * kGravity;
        node.vy += dy * kGravity;

        // Apply velocity and damping
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= damping;
        node.vy *= damping;
      });
    }

    setNodes(simulatedNodes);
    setLinks(simulatedLinks);
  };

  // Dragging handlers
  const handleMouseDown = (nodeId: string) => {
    setDraggingNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    
    // Account for zoom scale
    const x = (e.clientX - rect.left) * (800 / rect.width);
    const y = (e.clientY - rect.top) * (450 / rect.height);

    setNodes(prev =>
      prev.map(n => (n.id === draggingNodeId ? { ...n, x, y } : n))
    );
  };

  const handleMouseUpOrLeave = () => {
    setDraggingNodeId(null);
  };

  // Find coordinates for links
  const getNodeCoordinates = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 400, y: 225 };
  };

  const isMatched = (name: string) => {
    if (!searchQuery) return false;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Knowledge Concept Graph</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Interactive visualization outlining structural linkages and relationships between extracted document concepts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors w-48"
            />
          </div>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setZoom(prev => Math.min(prev + 0.1, 1.8))}
              className="p-1.5 hover:bg-white/10 rounded text-slate-300 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.6))}
              className="p-1.5 hover:bg-white/10 rounded text-slate-300 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SVG Concept Graph Panel */}
        <div className="lg:col-span-3 glass-card p-4 rounded-2xl border border-white/5 relative overflow-hidden h-[480px] bg-black/40">
          {nodes.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center space-y-2">
              <Network className="w-8 h-8 text-slate-600 animate-pulse" />
              <p className="text-sm text-slate-500">
                No concepts mapped yet. Upload files to extract concept graphs automatically.
              </p>
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox="0 0 800 450"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="h-full w-full select-none cursor-grab active:cursor-grabbing"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            >
              {/* Markers for Arrows */}
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255, 255, 255, 0.15)" />
                </marker>
              </defs>

              {/* Render Link Lines */}
              {links.map((link, idx) => {
                const source = getNodeCoordinates(link.source);
                const target = getNodeCoordinates(link.target);
                return (
                  <line
                    key={idx}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="rgba(99, 102, 241, 0.25)"
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                  />
                );
              })}

              {/* Render Node Dots */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isHighlight = isMatched(node.name);
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer"
                    onMouseDown={() => handleMouseDown(node.id)}
                    onClick={() => setSelectedNode(node)}
                  >
                    <circle
                      r={isSelected ? 10 : isHighlight ? 9 : 7}
                      fill={
                        isSelected 
                          ? '#a855f7' // Glowing Purple for active
                          : isHighlight 
                            ? '#f43f5e' // Glowing Rose for search matches
                            : '#6366f1' // Standard Indigo
                      }
                      className="transition-all duration-300"
                      filter={isSelected || isHighlight ? 'drop-shadow(0 0 8px currentColor)' : ''}
                    />
                    <text
                      y={-14}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize={11}
                      fontWeight={isSelected || isHighlight ? 'bold' : 'normal'}
                      className="pointer-events-none drop-shadow-md"
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          <div className="absolute bottom-4 left-4 p-2 bg-[#0d0d11]/80 rounded border border-white/5 text-[10px] text-slate-500 flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Standard Concept
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Search Match
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Selected Node
            </div>
          </div>
        </div>

        {/* Concept Inspector Panel */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 h-[480px] flex flex-col justify-between">
          {selectedNode ? (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="p-2 rounded bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 inline-flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">{selectedNode.name}</h3>
                <p className="text-xs text-slate-500 font-semibold uppercase">Source File:</p>
                <p className="text-xs text-indigo-300 font-medium truncate">{selectedNode.documentName}</p>
                
                <p className="text-xs text-slate-500 font-semibold uppercase pt-2">Description</p>
                <div className="bg-black/30 p-3 rounded border border-white/5 text-xs text-slate-300 leading-relaxed font-medium">
                  {selectedNode.description || 'No description extracted.'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-indigo-300 leading-relaxed">
                Tip: Drag concept nodes around in the graph grid to customize your visualization layout!
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-4">
              <HelpCircle className="w-8 h-8 text-slate-600" />
              <h3 className="text-sm font-bold text-white">Concept Inspector</h3>
              <p className="text-xs text-slate-500">
                Click on any concept node inside the interactive graph to view its definitions and source metadata documents.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
