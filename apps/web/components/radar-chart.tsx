'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

interface RadarChartProps {
  scores: {
    skill_match: number;
    experience_match: number;
    salary_match: number;
    location_match: number;
    hgat_cosine: number;
  };
}

export function MatchRadarChart({ scores }: RadarChartProps) {
  const data = [
    { dimension: 'Skills',     score: Math.round(scores.skill_match * 100) },
    { dimension: 'Experience', score: Math.round(scores.experience_match * 100) },
    { dimension: 'Salary',     score: Math.round(scores.salary_match * 100) },
    { dimension: 'Location',   score: Math.round(scores.location_match * 100) },
    { dimension: 'AI Match',   score: Math.round(scores.hgat_cosine * 100) },
  ];

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="var(--border-mid)" />
          <PolarAngleAxis 
            dataKey="dimension" 
            tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-jetbrains-mono)' }} 
          />
          <Radar
            name="Match Score"
            dataKey="score"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.3}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
