'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, UploadCloud } from "lucide-react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ApplyButtonProps {
  jobId: string | number;
  applyUrl: string;
  className?: string;
}

export function ApplyButton({ jobId, applyUrl, className }: ApplyButtonProps) {
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Check if it's a system job.
  // System jobs might have an empty applyUrl or a relative path, whereas scraped jobs usually start with http/https
  const isSystemJob = !applyUrl || applyUrl.startsWith("/") || applyUrl.includes("localhost");

  const handleApplyExternal = async () => {
    if (status === 'authenticated') {
      api.post(`/api/v1/jobs/${jobId}/apply-click`).catch(err => {
        console.error('Failed to track apply click:', err);
      });
    }
    window.open(applyUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDirectApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("cv_file", file);
      
      await api.post(`/api/v1/jobs/${jobId}/apply-direct`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success("Nộp CV thành công!");
      setIsOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Đã có lỗi xảy ra khi nộp CV");
    } finally {
      setIsUploading(false);
    }
  };

  if (isSystemJob) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger 
          render={
            <Button 
              className={`bg-accent hover:bg-accent/90 text-white shadow-[0_0_15px_var(--accent-glow)] transition-all hover:scale-[1.02] ${className}`}
            >
              Nộp đơn trực tiếp
              <UploadCloud className="w-4 h-4 ml-2" />
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nộp đơn ứng tuyển</DialogTitle>
            <DialogDescription>
              Tải CV của bạn lên (định dạng PDF) để ứng tuyển trực tiếp cho công việc này. CV sẽ được lưu trữ an toàn trên Cloudinary.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDirectApply} className="space-y-6 pt-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="cv_file">Tệp CV (PDF)</Label>
              <Input 
                id="cv_file" 
                type="file" 
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required 
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={!file || isUploading} className="bg-accent hover:bg-accent/90 text-white">
                {isUploading ? "Đang xử lý..." : "Nộp CV"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // External job (scraped)
  return (
    <Button 
      onClick={handleApplyExternal} 
      className={`bg-accent hover:bg-accent/90 text-white shadow-[0_0_15px_var(--accent-glow)] transition-all hover:scale-[1.02] ${className}`}
    >
      Ứng tuyển ngay
      <ExternalLink className="w-4 h-4 ml-2" />
    </Button>
  );
}
