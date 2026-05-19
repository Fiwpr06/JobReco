'use client';

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SkillGap, TrendingSkill, CV } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillBadge } from "@/components/skill-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BookOpen, TrendingUp, Target, Rocket } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SkillsAdvisorPage() {
  const { data: primaryCv } = useQuery<CV>({
    queryKey: ['primaryCv'],
    queryFn: async () => (await api.get('/api/v1/cvs/primary')).data,
  });

  const { data: skillGaps, isLoading: gapsLoading } = useQuery<SkillGap[]>({
    queryKey: ['skillGaps', primaryCv?.id],
    queryFn: async () => (await api.get(`/api/v1/skills/gaps?cv_id=${primaryCv?.id}`)).data,
    enabled: !!primaryCv?.id,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendingSkill[]>({
    queryKey: ['trends'],
    queryFn: async () => (await api.get('/api/v1/skills/trends')).data,
  });

  // Mock data if backend is offline
  const gaps = skillGaps || [
    { skill: 'Docker', tier: 'hard', slwg_penalty: 0.7, suggestion: 'Containerization is critical for backend roles. Consider the Docker Certified Associate path.' },
    { skill: 'Kubernetes', tier: 'hard', slwg_penalty: 0.7, suggestion: 'Highly requested alongside Docker. Start with Minikube basics.' },
    { skill: 'AWS', tier: 'medium', slwg_penalty: 0.3, suggestion: 'Cloud deployment is preferred. AWS Practitioner is a good start.' },
    { skill: 'CI/CD', tier: 'easy', slwg_penalty: 0.1, suggestion: 'Easy to learn using GitHub Actions for your side projects.' }
  ];

  const trendData = trends || [
    { skill_name: 'Python', demand_score: 95 },
    { skill_name: 'React', demand_score: 92 },
    { skill_name: 'Docker', demand_score: 88 },
    { skill_name: 'TypeScript', demand_score: 85 },
    { skill_name: 'AWS', demand_score: 82 },
    { skill_name: 'Kubernetes', demand_score: 80 },
    { skill_name: 'Node.js', demand_score: 75 },
    { skill_name: 'FastAPI', demand_score: 72 }
  ];

  const userSkills = primaryCv?.skills.map(s => s.skill_name) || ['Python', 'React', 'TypeScript'];
  const aheadSkills = trendData.filter(t => userSkills.includes(t.skill_name));

  if (!primaryCv && !gapsLoading) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <Target className="w-12 h-12 text-muted mx-auto mb-4" />
        <h2 className="text-2xl font-bold font-fraunces mb-2">No Data Available</h2>
        <p className="text-muted mb-6">Create a CV profile to unlock personalized skill advice and learnability paths.</p>
        <Link href="/cv/builder"><Button className="w-full bg-accent">Create Profile</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="font-fraunces text-3xl font-bold text-primary mb-2">Skills Advisor</h1>
        <p className="text-muted">Personalized up-skilling dashboard powered by SLWG graph analysis.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* LEFT: YOUR GAPS (55%) */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="font-fraunces text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent" /> Your Top Gaps
          </h2>
          
          {gapsLoading ? (
            <div className="space-y-4"><Skeleton className="h-32 w-full bg-surface" /><Skeleton className="h-32 w-full bg-surface" /></div>
          ) : (
            <div className="space-y-4">
              {gaps.map((gap, i) => (
                <Card key={i} className="bg-surface border-border hover:border-border-mid transition-colors">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-jetbrains-mono text-lg font-bold text-primary">{gap.skill}</span>
                        <SkillBadge skill="" tier={gap.tier as any} />
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted uppercase tracking-wider mb-1">Penalty</div>
                        <div className="font-jetbrains-mono text-danger font-bold">-{gap.slwg_penalty.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="bg-elevated/50 p-3 rounded-md border border-border border-dashed">
                      <p className="text-sm text-muted italic flex items-start gap-2">
                        <Rocket className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        {gap.suggestion}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: MARKET TRENDS (45%) */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="font-fraunces text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" /> Market Trends
          </h2>
          
          <Card className="bg-surface border-border">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm text-muted font-normal">Top 8 requested skills</CardTitle>
            </CardHeader>
            <CardContent className="h-80 pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="skill_name" type="category" width={80} tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono)' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                    itemStyle={{ color: 'var(--success)' }}
                  />
                  <Bar dataKey="demand_score" radius={[0, 4, 4, 0]} barSize={16}>
                    {trendData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={userSkills.includes(entry.skill_name) ? 'var(--success)' : 'var(--accent)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-5">
              <h3 className="font-fraunces font-bold text-success mb-3">You're ahead on:</h3>
              <p className="text-sm text-muted mb-4">You already possess these high-demand market skills.</p>
              <div className="flex flex-wrap gap-2">
                {aheadSkills.length > 0 ? (
                  aheadSkills.map(s => (
                    <SkillBadge key={s.skill_name} skill={s.skill_name} matched />
                  ))
                ) : (
                  <span className="text-sm italic text-muted">Keep learning to catch up with trends!</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
