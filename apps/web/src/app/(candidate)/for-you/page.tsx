"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MatchResult, CV } from "@/lib/types";
import { MatchResultCard } from "@/features/matching/components/match-result-card";
import { MatchResultSkeleton } from "@/components/skeleton/match-result-skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, FileWarning } from "lucide-react";
import Link from "next/link";
import MatchExplanationModal from "@/components/demo/match-explanation-modal";
import SkillRoadmapTimeline from "@/components/demo/skill-roadmap-timeline";
import { AnimatePresence } from "framer-motion";

export default function ForYouPage() {
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [selectedJobResult, setSelectedJobResult] = useState<MatchResult | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);

  const { data: cvs } = useQuery<CV[]>({
    queryKey: ["myCvs"],
    queryFn: async () => {
      // Mock logic if real API fails
      try {
        const res = await api.get("/api/v1/cvs/");
        return res.data;
      } catch {
        return [
          { id: 1, title_en: "Senior Frontend Dev CV", is_primary: true },
        ];
      }
    },
  });

  useEffect(() => {
    if (cvs && cvs.length > 0 && !selectedCvId) {
      const primary = cvs.find((c) => c.is_primary) || cvs[0];
      setSelectedCvId(primary.id.toString());
    }
  }, [cvs, selectedCvId]);

  const matchMutation = useMutation({
    mutationFn: async (cvId: string) => {
      // Use real API call. The backend latency will naturally show the skeletons.
      const res = await api.post("/api/v1/matching/cv-to-jobs", {
        cv_id: parseInt(cvId),
        top_k: 10,
      });
      return res.data.results as MatchResult[];
    },
  });

  // Mock auto trigger for presentation
  useEffect(() => {
    if (
      selectedCvId &&
      !matchMutation.data &&
      !matchMutation.isPending &&
      !matchMutation.isError
    ) {
      matchMutation.mutate(selectedCvId);
    }
  }, [selectedCvId]);

  if (cvs?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-elevated rounded-full flex items-center justify-center mb-6">
          <FileWarning className="w-8 h-8 text-warning" />
        </div>
        <h2 className="font-fraunces text-2xl font-bold mb-2">
          Tải CV của bạn lên trước
        </h2>
        <p className="text-muted mb-6">
          Chúng tôi cần thông tin về kỹ năng và kinh nghiệm của bạn để hệ thống
          có thể gợi ý các công việc phù hợp.
        </p>
        <Link href="/cv/builder">
          <Button className="bg-accent hover:bg-accent/90 w-full">
            Tạo hồ sơ CV
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto pb-12">
        {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-fraunces text-3xl font-bold text-primary">
            Công việc hệ thống gợi ý cho bạn
          </h1>
          <p className="text-muted text-sm mt-1">
            Xếp hạng kết hợp độ tương đồng đồ nghĩa HGAT và điểm phạt thiếu hụt
            kỹ năng SLWG
          </p>
        </div>

        <div className="flex items-center gap-3 bg-surface p-2 rounded-lg border border-border">
          <Select
            value={selectedCvId}
            onValueChange={(val) => setSelectedCvId(val || "")}
          >
            <SelectTrigger className="w-[200px] border-0 bg-transparent focus:ring-0">
              <SelectValue placeholder="Chọn CV" />
            </SelectTrigger>
            <SelectContent className="bg-elevated border-border-mid">
              {cvs?.map((cv) => (
                <SelectItem
                  key={cv.id}
                  value={cv.id.toString()}
                  className="focus:bg-surface"
                >
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
            <RefreshCw
              className={`w-4 h-4 ${matchMutation.isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {matchMutation.isError && (
        <div className="bg-danger/10 border border-danger/20 p-6 rounded-lg text-center my-8">
          <p className="text-danger font-medium">
            Hệ thống hiện đang khởi động hoặc không phản hồi.
          </p>
          <Button
            variant="outline"
            className="mt-4 border-danger/30 text-danger hover:bg-danger/10"
            onClick={() => matchMutation.mutate(selectedCvId)}
          >
            Thử lại
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
            <MatchResultCard 
              key={result.job_id} 
              result={result} 
              onShowAnalysis={(res) => {
                setSelectedJobResult(res);
                setShowRoadmap(false);
              }}
            />
          ))}

          <div className="text-center pt-8">
            <p className="text-sm text-muted mb-4">
              Bạn đã xem hết danh sách công việc có độ phù hợp cao nhất.
            </p>
            <Button
              variant="outline"
              className="border-border hover:bg-elevated"
            >
              Tải thêm kết quả
            </Button>
          </div>
        </div>
      )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedJobResult && !showRoadmap && (
          <MatchExplanationModal 
            onClose={() => setSelectedJobResult(null)} 
            onViewRoadmap={() => setShowRoadmap(true)} 
            jobResult={selectedJobResult}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedJobResult && showRoadmap && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 p-4 flex items-center justify-center">
            <SkillRoadmapTimeline 
              onBack={() => setShowRoadmap(false)} 
              jobResult={selectedJobResult}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
