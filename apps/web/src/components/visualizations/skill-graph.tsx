"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BaseEdge,
  getBezierPath,
  EdgeProps,
  NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { motion } from "framer-motion";

// --- API Schema Interfaces ---
interface GraphNodeData {
  id: string;
  label: string;
  category: "technical" | "soft" | "domain";
  status: "owned" | "missing" | "matched";
  tier?: string;
}

interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  animated: boolean;
}

interface SkillGraphResponse {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

// --- Dagre Layout Setup ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 180;
const nodeHeight = 60;

const getLayoutedElements = (nodes: any[], edges: any[], direction = "LR") => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Custom Node ---
const SkillNode = ({ data }: NodeProps<any>) => {
  const { label, category, status, tier } = data as GraphNodeData;

  // Bloomberg aesthetic colors
  const colorMap = {
    technical: "#00ff00", // Neon Green
    soft: "#b000ff",      // Neon Purple
    domain: "#00e5ff",    // Neon Cyan
  };

  const baseColor = colorMap[category] || "#00ff00";
  
  // Status styling
  const isMissing = status === "missing";
  const isMatched = status === "matched";
  
  const borderStyle = isMissing ? "dashed" : "solid";
  const opacity = isMissing ? 0.7 : 1;
  const boxShadow = isMatched ? `0 0 15px ${baseColor}, inset 0 0 10px ${baseColor}` : `0 0 5px ${baseColor}`;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="relative flex items-center justify-center p-3 rounded-md bg-black/80 font-mono text-xs uppercase text-white"
      style={{
        border: `1px ${borderStyle} ${baseColor}`,
        boxShadow,
        opacity,
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        textShadow: `0 0 5px ${baseColor}`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="flex flex-col items-center text-center">
        <span className="font-bold truncate w-full px-2">{label}</span>
        {tier && (
          <span className="text-[10px] mt-1 opacity-70" style={{ color: baseColor }}>
            [{tier}]
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </motion.div>
  );
};

// --- Custom Animated Edge ---
const BloombergEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const isAnimated = data?.animated;
  const isMissingPath = data?.type === "missing"; // Custom logic if needed

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 1, stroke: "#333" }} />
      {/* Particle Effect / Glowing Line overlay */}
      <motion.path
        d={edgePath}
        fill="none"
        stroke={isAnimated ? "#00ff00" : "#4ade80"}
        strokeWidth={isAnimated ? 2 : 1}
        strokeDasharray={isAnimated ? "5 5" : "none"}
        className={isAnimated ? "animate-pulse" : ""}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        style={{
          filter: isAnimated ? "drop-shadow(0 0 8px #00ff00)" : "none",
        }}
      />
    </>
  );
};

const nodeTypes = {
  skill: SkillNode,
};

const edgeTypes = {
  bloomberg: BloombergEdge,
};

// --- Main Component ---
interface SkillGraphProps {
  cvId: number;
  jobId?: number;
  className?: string;
}

export function SkillGraph({ cvId, jobId, className = "" }: SkillGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { data: graphData, isLoading, error } = useQuery<SkillGraphResponse>({
    queryKey: ["skill-graph", cvId, jobId],
    queryFn: async () => {
      // Assuming Next.js app running API on same host or proxied
      // Replace with your actual configured Axios instance
      const params = new URLSearchParams({ cv_id: cvId.toString() });
      if (jobId) params.append("job_id", jobId.toString());
      const res = await axios.get(`http://localhost:8000/api/v1/skills/graph?${params.toString()}`, {
        headers: {
          // Add your auth token if required. Mocking for demo:
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`
        }
      });
      return res.data;
    },
  });

  useEffect(() => {
    if (graphData && graphData.nodes.length > 0) {
      const initialNodes = graphData.nodes.map((n) => ({
        id: n.id,
        type: "skill",
        data: n,
        position: { x: 0, y: 0 }, // Will be set by dagre
      }));

      const initialEdges = graphData.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "bloomberg",
        animated: e.animated,
        data: e,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: e.animated ? "#00ff00" : "#4ade80",
        },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    }
  }, [graphData, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-black w-full h-[600px] border border-[#333] ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-transparent border-t-[#00ff00] rounded-full"
        />
        <span className="ml-3 font-mono text-[#00ff00] text-sm animate-pulse">
          ANALYZING_KNOWLEDGE_GRAPH...
        </span>
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className={`flex items-center justify-center bg-black w-full h-[600px] border border-red-500/50 ${className}`}>
        <span className="font-mono text-red-500 text-sm">
          ERR_GRAPH_LOAD_FAILED
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full h-[600px] bg-black border border-[#222] rounded-lg overflow-hidden relative ${className}`}>
      {/* Grid overlay for aesthetic */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }}
      />
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="dark"
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#111" gap={16} />
        <Controls className="bg-black/80 border border-[#333] fill-white" />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/90 border border-[#333] p-3 rounded text-[10px] font-mono text-white backdrop-blur-sm">
        <div className="mb-2 uppercase text-[#00ff00] font-bold border-b border-[#333] pb-1">Legend</div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-solid border-[#00ff00]" />
            <span>Owned Skill (Technical)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-solid border-[#b000ff]" />
            <span>Owned Skill (Soft)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-dashed border-[#00ff00] opacity-70" />
            <span>Missing Requirement</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0 border-t border-dashed border-[#00ff00]" />
            <span>Relationship / Path</span>
          </div>
        </div>
      </div>
    </div>
  );
}
