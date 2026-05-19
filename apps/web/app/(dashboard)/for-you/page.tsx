'use client';

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MatchResult, CV } from "@/lib/types";
import { MatchResultCard } from "@/components/match-result-card";
import { MatchResultSkeleton } from "@/components/skeleton/match-result-skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, FileWarning } from "lucide-react";
import Link from "next/link";

export default function ForYouPage() {
  const [selectedCvId, setSelectedCvId] = useState<string>('');

  const { data: cvs } = useQuery<CV[]>({
    queryKey: ['myCvs'],
    queryFn: async () => {
      // Mock logic if real API fails
      try {
        const res = await api.get('/api/v1/cvs/');
        return res.data;
      } catch {
        return [{ id: 1, title_en: 'Senior Frontend Dev CV', is_primary: true }];
      }
    }
  });

  useEffect(() => {
    if (cvs && cvs.length > 0 && !selectedCvId) {
      const primary = cvs.find(c => c.is_primary) || cvs[0];
      setSelectedCvId(primary.id.toString());
    }
  }, [cvs, selectedCvId]);

  const matchMutation = useMutation({
    mutationFn: async (cvId: string) => {
      // Use real API call. The backend latency will naturally show the skeletons.
      const res = await api.post('/api/v1/matching/cv-to-jobs', { cv_id: parseInt(cvId), top_k: 10 });
      return res.data.results as MatchResult[];
    }
  });

  // Mock auto trigger for presentation
  useEffect(() => {
    if (selectedCvId && !matchMutation.data && !matchMutation.isPending && !matchMutation.isError) {
      matchMutation.mutate(selectedCvId);
    }
  }, [selectedCvId]);

  if (cvs?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-elevated rounded-full flex items-center justify-center mb-6">
          <FileWarning className="w-8 h-8 text-warning" />
        </div>
        <h2 className="font-fraunces text-2xl font-bold mb-2">Upload your CV first</h2>
        <p className="text-muted mb-6">We need your skills and experience to match you with the right jobs using our AI model.</p>
        <Link href="/cv/builder">
          <Button className="bg-accent hover:bg-accent/90 w-full">Create CV Profile</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-fraunces text-3xl font-bold text-primary">Your AI Matches</h1>
          <p className="text-muted text-sm mt-1">Ranked by HGAT semantic similarity + SLWG skill gap penalty</p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface p-2 rounded-lg border border-border">
          <Select value={selectedCvId} onValueChange={(val) => setSelectedCvId(val || '')}>
            <SelectTrigger className="w-[200px] border-0 bg-transparent focus:ring-0">
              <SelectValue placeholder="Select CV" />
            </SelectTrigger>
            <SelectContent className="bg-elevated border-border-mid">
              {cvs?.map(cv => (
                <SelectItem key={cv.id} value={cv.id.toString()} className="focus:bg-surface">
                  {cv.title_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-px h-6 bg-border" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-accent hover:text-accent hover:bg-accent/10"
            onClick={() => selectedCvId && matchMutation.mutate(selectedCvId)}
            disabled={matchMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 ${matchMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {matchMutation.isError && (
        <div className="bg-danger/10 border border-danger/20 p-6 rounded-lg text-center my-8">
          <p className="text-danger font-medium">AI Service is currently warming up or unavailable.</p>
          <Button variant="outline" className="mt-4 border-danger/30 text-danger hover:bg-danger/10" onClick={() => matchMutation.mutate(selectedCvId)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Mandatory Skeleton Loading */}
      {matchMutation.isPending && (
        <div className="space-y-4">
          <MatchResultSkeleton />
          <MatchResultSkeleton />
          <MatchResultSkeleton />
        </div>
      )}

      {/* Results Feed */}
      {!matchMutation.isPending && matchMutation.data && (
        <div className="space-y-6">
          {matchMutation.data.map((result) => (
            <MatchResultCard key={result.job_id} result={result} />
          ))}
          
          <div className="text-center pt-8">
            <p className="text-sm text-muted mb-4">You've reached the end of highly matched jobs.</p>
            <Button variant="outline" className="border-border hover:bg-elevated">
              Load more results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
