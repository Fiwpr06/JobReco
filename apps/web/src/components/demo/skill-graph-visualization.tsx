"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
  Handle,
  Background,
  Controls
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '@xyflow/react/dist/style.css';

export interface GraphData {
  candidate: { name: string; major: string };
  current_skills: string[];
  target_job: { title: string; company: string };
  required_skills: string[];
  gap_analysis: {
    matching_skills: string[];
    missing_skills: { skill: string; estimated_time: string }[];
  }
}

// --- CUSTOM NODES ---
function CustomNode({ data, isConnectable }: any) {
  return (
    <div style={{ padding: '15px 25px', border: '2px solid #3b82f6', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)', textAlign: 'center', minWidth: 180, fontFamily: 'inherit' }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: '#3b82f6', width: 8, height: 8 }} />
      <strong style={{ fontSize: '16px', fontWeight: 700 }}>{data.label.split('\n')[0]}</strong><br/>
      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{data.label.split('\n')[1]}</span>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: '#3b82f6', width: 8, height: 8 }} />
    </div>
  );
}

function SkillNode({ data, isConnectable }: any) {
  let color = '#64748b'; // neutral
  let bg = '#f8fafc';
  let text = '#334155';
  
  if (data.status === 'matching') {
    color = '#22c55e'; // green
    bg = '#f0fdf4';
    text = '#166534';
  } else if (data.status === 'missing') {
    color = '#f97316'; // orange
    bg = '#fff7ed';
    text = '#9a3412';
  }

  return (
    <div style={{ padding: '8px 16px', border: `2px solid ${color}`, borderRadius: '20px', background: bg, color: text, boxShadow: `0 2px 4px ${color}20`, fontSize: 13, fontFamily: 'inherit', fontWeight: 600, minWidth: 100, textAlign: 'center' }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: color, width: 6, height: 6 }} />
      {data.label}
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: color, width: 6, height: 6 }} />
    </div>
  );
}

// --- CUSTOM EDGES ---
function GapEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: any) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeDasharray: '5,5' }} />
      {data?.showTooltip && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#ffffff',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #f97316',
              color: '#1e293b',
              fontSize: 12,
              fontWeight: 600,
              pointerEvents: 'all',
              zIndex: 1000,
              boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2)',
              fontFamily: 'inherit'
            }}
            className="nodrag nopan"
          >
            Thiếu: <span style={{color: '#ea580c'}}>{data.skill}</span><br/>
            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>Thời gian: {data.time}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// --- LOGIC ---
const getNodes = (phase: number, mockData: GraphData) => {
  const currentOnly = mockData.current_skills.filter(s => !mockData.gap_analysis.matching_skills.includes(s));
  
  // Compact layout with centered vertical alignment
  const initialNodes = [
    { id: 'candidate', position: { x: 0, y: 220 }, data: { label: `${mockData.candidate.name}\n${mockData.candidate.major}` }, type: 'custom', targetPosition: 'right', sourcePosition: 'right' },
    { id: 'target', position: { x: 1250, y: 220 }, data: { label: `${mockData.target_job.title}\n${mockData.target_job.company}` }, type: 'custom', targetPosition: 'left', sourcePosition: 'left' },
    
    // Matching (Middle-Left)
    ...mockData.gap_analysis.matching_skills.map((skill, i) => ({
      id: `skill-${skill}`, position: { x: 650, y: 100 + i * 90 }, data: { label: skill, status: 'neutral' }, type: 'skill'
    })),
  
    // Current Only (Top-Left)
    ...currentOnly.map((skill, i) => ({
      id: `skill-${skill}`, position: { x: 350, y: 40 + i * 80 }, data: { label: skill, status: 'neutral' }, type: 'skill'
    })),
  
    // Missing (Middle-Right)
    ...mockData.gap_analysis.missing_skills.map((item, i) => ({
      id: `skill-${item.skill}`, position: { x: 950, y: 60 + i * 90 }, data: { label: item.skill, status: 'missing' }, type: 'skill'
    }))
  ];

  return initialNodes.map(node => {
    let hidden = false;
    let status = node.data.status;

    if (phase === 0) {
      const missingIds = mockData.gap_analysis.missing_skills.map(m => `skill-${m.skill}`);
      if (node.id === 'target' || missingIds.includes(node.id)) {
        hidden = true;
      }
    }

    if (phase >= 2) {
      if (mockData.gap_analysis.matching_skills.map(s => `skill-${s}`).includes(node.id)) {
        status = 'matching';
      }
    }

    return { ...node, hidden, data: { ...node.data, status } };
  });
};

const getEdges = (phase: number, mockData: GraphData) => {
  const edges: any[] = [];

  // Phase 0: Candidate to Current + Matching
  const currentSkills = mockData.current_skills;
  currentSkills.forEach(skill => {
    const isMatching = phase >= 2 && mockData.gap_analysis.matching_skills.includes(skill);
    edges.push({
      id: `c-${skill}`,
      source: 'candidate',
      target: `skill-${skill}`,
      style: { stroke: isMatching ? '#22c55e' : '#cbd5e1', strokeWidth: 2 },
      animated: isMatching,
      hidden: false,
    });
  });

  // Phase 1: Required skills to Target
  const requiredSkills = mockData.required_skills;
  requiredSkills.forEach(skill => {
    const isMatching = phase >= 2 && mockData.gap_analysis.matching_skills.includes(skill);
    edges.push({
      id: `${skill}-t`,
      source: `skill-${skill}`,
      target: 'target',
      style: { stroke: isMatching ? '#22c55e' : '#cbd5e1', strokeWidth: 2 },
      animated: isMatching,
      hidden: phase < 1,
    });
  });

  // Phase 3: Gap Edges
  mockData.gap_analysis.missing_skills.forEach(item => {
    edges.push({
      id: `gap-${item.skill}`,
      source: 'candidate',
      target: `skill-${item.skill}`,
      type: 'gap',
      style: { stroke: '#f97316', strokeWidth: 2, strokeDasharray: '5,5' },
      animated: true,
      hidden: phase < 3,
      data: {
        showTooltip: phase >= 4,
        skill: item.skill,
        time: item.estimated_time,
      }
    });
  });

  return edges;
};

export default function SkillGraphVisualization({ data }: { data?: GraphData }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // 10s animation sequence
    const timer1 = setTimeout(() => setPhase(1), 2000);
    const timer2 = setTimeout(() => setPhase(2), 4000);
    const timer3 = setTimeout(() => setPhase(3), 6000);
    const timer4 = setTimeout(() => setPhase(4), 8000);
    
    // Loop back for demo purposes
    const timer5 = setTimeout(() => setPhase(0), 12000);
    
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4); clearTimeout(timer5); };
  }, [phase]);

  const nodes = useMemo(() => {
    if (!data) return [];
    return getNodes(phase, data);
  }, [phase, data]);
  
  const edges = useMemo(() => {
    if (!data) return [];
    return getEdges(phase, data);
  }, [phase, data]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode, skill: SkillNode }), []);
  const edgeTypes = useMemo(() => ({ gap: GapEdge }), []);

  return (
    <div className="w-full h-[650px] bg-white rounded-xl border border-slate-200 relative overflow-hidden font-sans shadow-sm">
      <style dangerouslySetInnerHTML={{__html: `
        .react-flow__edge-path {
          transition: stroke 0.5s ease, stroke-width 0.5s ease;
        }
      `}} />
      <div className="absolute top-4 left-4 z-10 text-indigo-600">
        <h2 className="text-xl font-bold">HỆ THỐNG FASTART</h2>
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          ĐANG PHÂN TÍCH... [GIAI ĐOẠN {phase}/4]
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 z-10 flex gap-4 text-xs font-semibold">
        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          Kỹ năng phù hợp
        </div>
        <div className="flex items-center gap-2 text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          Kỹ năng còn thiếu
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, minZoom: 0.5, maxZoom: 1.5 }}
        colorMode="light"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={16} />
        <Controls className="!bg-white !border-slate-200 !fill-slate-600 shadow-sm" />
      </ReactFlow>
    </div>
  );
}
