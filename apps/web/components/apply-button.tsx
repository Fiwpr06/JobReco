'use client';

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";

interface ApplyButtonProps {
  jobId: string;
  applyUrl: string;
  className?: string;
}

export function ApplyButton({ jobId, applyUrl, className }: ApplyButtonProps) {
  const { status } = useSession();

  const handleApply = async () => {
    // 1. Track click (fire-and-forget, non-blocking) if logged in
    if (status === 'authenticated') {
      api.post(`/api/v1/jobs/${jobId}/apply-click`).catch(err => {
        console.error('Failed to track apply click:', err);
      });
    }

    // 2. Open external URL securely
    window.open(applyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button 
      onClick={handleApply} 
      className={`bg-accent hover:bg-accent/90 text-white shadow-[0_0_15px_var(--accent-glow)] transition-all hover:scale-[1.02] ${className}`}
    >
      Apply Now
      <ExternalLink className="w-4 h-4 ml-2" />
    </Button>
  );
}
