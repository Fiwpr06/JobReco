"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';

interface Application {
  id: number;
  job_id: number;
  job_title: string;
  company_name: string;
  status: ApplicationStatus;
  applied_at: string;
  apply_url: string;
  cv_title?: string;
  cv_url?: string;
  source: 'crawled' | 'self-posted';
}

export default function ApplicationsHistoryPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/jobs/applications/me`, {
      headers: {
        // "Authorization": `Bearer ${token}` // TODO: Add auth token here from your auth store
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch applications");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setApplications(data);
        }
      })
      .catch(err => console.error("Error fetching applications:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Đang chờ</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><FileText className="w-3 h-3 mr-1" /> Đã xem CV</Badge>;
      case 'shortlisted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Trúng tuyển vòng 1</Badge>;
      case 'hired':
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Được nhận</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Bị từ chối</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải lịch sử ứng tuyển...</div>;
  }

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8 relative">
        <div className="absolute top-0 right-0">
          <Link href="/">
            <Button variant="outline">Quay lại Trang chủ</Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Lịch sử ứng tuyển</h1>
        <p className="text-muted-foreground mt-2">Theo dõi trạng thái các công việc bạn đã nộp CV trên hệ thống.</p>
      </div>

      <div className="space-y-4">
        {applications.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-4">Bạn chưa ứng tuyển công việc nào.</p>
              <Link href="/jobs">
                <Button>Tìm việc ngay</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/jobs/${app.job_id}`} className="text-xl font-semibold hover:text-primary transition-colors">
                        {app.job_title}
                      </Link>
                      {app.source === 'crawled' && (
                        <Badge variant="secondary" className="text-xs">Web ngoài</Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground font-medium">{app.company_name}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                      <span className="flex items-center">
                        Nộp cách đây {formatDistanceToNow(new Date(app.applied_at), { addSuffix: false, locale: vi })}
                      </span>
                      {app.cv_title && (
                        <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-xs">
                          <FileText className="w-3 h-3" /> {app.cv_title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 min-w-[140px]">
                    {getStatusBadge(app.status)}
                    
                    {app.source === 'crawled' ? (
                      <a href={app.apply_url} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="outline" size="sm" className="w-full">
                          Xem trên Web <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                      </a>
                    ) : app.cv_url ? (
                      <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">
                          Xem CV đã nộp <FileText className="w-3 h-3 ml-2" />
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
