'use client';

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
    { label: 'Kỹ năng', score: Math.round(scores.skill_match * 100), color: 'bg-blue-500' },
    { label: 'Kinh nghiệm', score: Math.round(scores.experience_match * 100), color: 'bg-indigo-500' },
    { label: 'Mức lương', score: Math.round(scores.salary_match * 100), color: 'bg-emerald-500' },
    { label: 'Địa điểm', score: Math.round(scores.location_match * 100), color: 'bg-amber-500' },
    { label: 'Hệ thống AI', score: Math.round(scores.hgat_cosine * 100), color: 'bg-purple-500' },
  ];

  return (
    <div className="w-full flex flex-col gap-4 pt-2">
      {data.map((item, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="text-slate-700">{item.label}</span>
            <span className="text-slate-900 font-bold font-jetbrains-mono">{item.score}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
