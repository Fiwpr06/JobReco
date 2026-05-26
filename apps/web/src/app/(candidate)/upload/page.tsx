"use client";

import React, { useState } from 'react';
import UploadAnalyzer from '@/components/demo/upload-analyzer';
import SkillGraphVisualization from '@/components/demo/skill-graph-visualization';
import MatchExplanationModal from '@/components/demo/match-explanation-modal';
import SkillRoadmapTimeline from '@/components/demo/skill-roadmap-timeline';
import { motion, AnimatePresence } from 'framer-motion';

export default function UnifiedUploadPage() {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete'>('idle');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'main' | 'roadmap'>('main');

  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-100px)] flex flex-col">
      <AnimatePresence mode="wait">
        {viewState === 'main' ? (
          <motion.div 
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`flex flex-col xl:flex-row gap-8 w-full transition-all duration-500 ${status === 'analyzing' ? 'max-w-[1600px]' : 'max-w-4xl'} mx-auto flex-1`}
          >
            {/* Cột trái: Upload Analyzer */}
            <div className={`transition-all duration-500 ${status === 'analyzing' ? 'w-full xl:w-1/2' : 'w-full'}`}>
              <UploadAnalyzer 
                onStatusChange={setStatus} 
                onJobClick={(jobId) => setSelectedJobId(jobId)} 
              />
            </div>

            {/* Cột phải: Skill Graph Visualization */}
            <AnimatePresence>
              {status === 'analyzing' && (
                <motion.div 
                  initial={{ opacity: 0, x: 50, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: '100%' }}
                  exit={{ opacity: 0, scale: 0.9, width: 0 }}
                  className="w-full xl:w-1/2 overflow-hidden flex items-center"
                >
                  <div className="w-full">
                    <SkillGraphVisualization />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            key="roadmap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex-1"
          >
            <SkillRoadmapTimeline onBack={() => setViewState('main')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Cảnh 6 (Match Explanation) */}
      <AnimatePresence>
        {selectedJobId && viewState === 'main' && (
          <MatchExplanationModal 
            onClose={() => setSelectedJobId(null)}
            onViewRoadmap={() => {
              setSelectedJobId(null);
              setViewState('roadmap');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
