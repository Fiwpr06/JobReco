'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, AlertTriangle, FileText, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { SkillGap, CV, TrendingSkill } from "@/lib/types";

export default function DashboardPage() {
  const { data: primaryCv, isLoading: cvLoading } = useQuery<CV>({
    queryKey: ['primaryCv'],
    queryFn: async () => {
      const res = await api.get('/api/v1/cvs/primary');
      return res.data;
    },
    retry: 1
  });

  const { data: skillGaps, isLoading: gapsLoading } = useQuery<SkillGap[]>({
    queryKey: ['skillGaps', primaryCv?.id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/skills/gaps?cv_id=${primaryCv?.id}`);
      return res.data;
    },
    enabled: !!primaryCv?.id,
    retry: 1
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendingSkill[]>({
    queryKey: ['trends'],
    queryFn: async () => {
      const res = await api.get('/api/v1/skills/trends');
      return res.data;
    },
    retry: 1
  });

  // Mock data for presentation if backend fails
  const mockGaps: SkillGap[] = skillGaps || (primaryCv ? [
    { skill: 'Docker', slwg_penalty: 0.7, tier: 'hard', omega: 0.7, suggestion: 'Study Docker containers' },
    { skill: 'Kubernetes', slwg_penalty: 0.7, tier: 'hard', omega: 0.7, suggestion: 'Study Kubernetes orchestration' },
    { skill: 'AWS', slwg_penalty: 0.3, tier: 'medium', omega: 0.3, suggestion: 'Study AWS services' },
  ] : []);

  const mockTrends = trends || [
    { skill_name: 'Python', demand_score: 95 },
    { skill_name: 'React', demand_score: 90 },
    { skill_name: 'Node.js', demand_score: 85 },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Stats Row */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted flex items-center gap-2">
              <FileText className="w-4 h-4" /> Primary CV
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cvLoading ? <Skeleton className="h-8 w-3/4 bg-elevated" /> : (
              primaryCv ? (
                <div>
                  <div className="text-2xl font-bold text-primary truncate">{primaryCv.title_en}</div>
                  <p className="text-sm text-success flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" /> Active for matching
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-medium text-warning">No CV found</div>
                  <Link href="/cv" className="text-sm text-accent hover:underline mt-1 block">
                    Create your profile →
                  </Link>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Last Match Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {primaryCv ? (
              <>
                <div className="text-2xl font-bold text-primary font-jetbrains-mono">47 Jobs</div>
                <p className="text-sm text-muted mt-1">Found within 80% threshold</p>
              </>
            ) : (
              <div className="text-sm text-muted mt-2">Chưa có dữ liệu.</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Top Skill Gap
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gapsLoading && !!primaryCv?.id ? <Skeleton className="h-8 w-1/2 bg-elevated" /> : (
              <div>
                <div className="text-2xl font-bold text-danger font-jetbrains-mono">
                  {mockGaps[0]?.skill || 'None'}
                </div>
                <p className="text-sm text-muted mt-1">
                  Penalty: -{(mockGaps[0]?.slwg_penalty || 0).toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle>Skill Gaps Impact</CardTitle>
            <p className="text-sm text-muted">Top missing skills affecting your match scores</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockGaps.slice(0, 5)} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="skill" type="category" width={100} tick={{ fill: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-jetbrains-mono)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                  itemStyle={{ color: 'var(--danger)' }}
                  formatter={(value: any) => [`Penalty: -${Number(value).toFixed(2)}`, 'SLWG Impact']}
                />
                <Bar dataKey="slwg_penalty" fill="var(--danger)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle>Trending in Market</CardTitle>
            <p className="text-sm text-muted">Most requested skills this week</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendsLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full bg-elevated" />)
              ) : (
                mockTrends.slice(0, 5).map((trend, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-md bg-elevated border border-border-mid">
                    <span className="font-jetbrains-mono font-medium">{trend.skill_name}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-base rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${trend.demand_score}%` }} />
                      </div>
                      <span className="text-xs text-muted w-8 text-right">{trend.demand_score}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 pt-4">
        <Link href="/for-you">
          <Button className="bg-accent hover:bg-accent/90 px-6 h-12 shadow-[0_0_15px_var(--accent-glow)]">
            Run AI Matching <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
        <Link href="/cv">
          <Button variant="outline" className="border-border hover:bg-elevated px-6 h-12">
            {primaryCv ? 'Update CV' : 'Upload CV'}
          </Button>
        </Link>
        {primaryCv && (
          <Link href="/cv/builder">
            <Button variant="outline" className="border-border hover:bg-elevated px-6 h-12">
              Fix Manually
            </Button>
          </Link>
        )}
        <Link href="/jobs">
          <Button variant="outline" className="border-border hover:bg-elevated px-6 h-12">
            Browse All Jobs
          </Button>
        </Link>
      </div>
    </div>
  );
}
