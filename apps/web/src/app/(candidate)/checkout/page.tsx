'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, QrCode } from "lucide-react";
import Image from "next/image";

interface PaymentDetails {
  order_code: string;
  amount: number;
  qr_url: string;
  status: string;
}

export default function CheckoutPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "premium";
  
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [status, setStatus] = useState<"pending" | "completed" | "failed">("pending");
  const [countdown, setCountdown] = useState(600); // 10 minutes

  useEffect(() => {
    if (!session) return;
    
    // Create payment request on mount
    const createPayment = async () => {
      try {
        const amount = plan === "premium" ? 99000 : 0;
        if (amount === 0) {
          router.push("/pricing");
          return;
        }

        const { data } = await api.post("/api/v1/payments/create-qr", {
          package_name: `plan_${plan}`,
          amount
        });
        setPayment(data);
        setLoading(false);
      } catch (error) {
        toast.error("Không thể khởi tạo thanh toán.");
        router.push("/pricing");
      }
    };

    createPayment();
  }, [session, plan, router]);

  // Polling for status
  useEffect(() => {
    if (!payment || status === "completed") return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/v1/payments/status/${payment.order_code}`);
        if (data.status === "completed") {
          setStatus("completed");
          clearInterval(interval);
          toast.success("Thanh toán thành công! Chào mừng bạn đến với Premium.");
          // Refresh session to get new tier
          await update();
        }
      } catch (err) {
        // silently fail and retry
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [payment, status, update]);

  // Countdown timer
  useEffect(() => {
    if (status === "completed" || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [status, countdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleManualComplete = async () => {
    // This is just a MOCK button for testing without a real bank transfer
    try {
      await api.post("/api/v1/payments/webhook", {
        order_code: payment?.order_code,
        amount: payment?.amount,
        status: "completed"
      });
      // The polling will catch it, or we can just set it here
      setStatus("completed");
      await update();
      toast.success("Thanh toán giả lập thành công!");
    } catch (e) {
      toast.error("Lỗi khi giả lập thanh toán.");
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500">Đang khởi tạo cổng thanh toán...</p>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="rounded-3xl border border-green-200 bg-green-50 p-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Thanh toán thành công!</h2>
          <p className="text-lg text-slate-600 mb-8">
            Tài khoản của bạn đã được nâng cấp lên Premium. Hãy tận hưởng các tính năng AI tuyệt vời nhất.
          </p>
          <Button onClick={() => router.push("/profile/billing")} size="lg" className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700">
            Xem lịch sử thanh toán
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Thanh toán đơn hàng</h1>
        <p className="text-slate-500 mt-2">Mã đơn hàng: <span className="font-mono font-medium text-slate-700">{payment?.order_code}</span></p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* QR Code Section */}
        <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center">
          <div className="mb-6 flex items-center justify-center text-indigo-600">
            <QrCode size={32} className="mr-2" />
            <h3 className="text-xl font-bold">Mở App Ngân hàng để quét mã</h3>
          </div>
          
          <div className="relative h-80 w-80 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 mb-6 flex items-center justify-center">
            {payment?.qr_url ? (
              <Image 
                src={payment.qr_url} 
                alt="VietQR" 
                layout="fill" 
                objectFit="contain"
                className="p-4"
              />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            )}
          </div>
          
          <div className="text-center w-full">
            <p className="text-sm text-slate-500 mb-2">Đang chờ thanh toán...</p>
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="font-mono text-xl font-bold text-slate-800">{formatTime(countdown)}</span>
            </div>
          </div>
          
          {/* MOCK BUTTON FOR TESTING */}
          {process.env.NODE_ENV !== "production" && (
            <div className="mt-8 pt-6 border-t w-full text-center">
              <Button onClick={handleManualComplete} variant="outline" size="sm" className="text-xs text-slate-500 border-dashed">
                [Test] Giả lập quét QR thành công
              </Button>
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 border-b pb-2">Chi tiết giao dịch</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Gói dịch vụ</span>
                <span className="font-medium text-slate-900">Premium 1 Tháng</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Người mua</span>
                <span className="font-medium text-slate-900">{session.user.name || session.user.email}</span>
              </div>
              <div className="flex justify-between pt-4 border-t">
                <span className="text-slate-500 font-medium">Tổng tiền</span>
                <span className="text-2xl font-black text-indigo-600">{payment?.amount.toLocaleString()}đ</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl bg-indigo-50 p-6 text-sm text-indigo-800">
            <h4 className="font-bold mb-2 flex items-center">
              <CheckCircle2 size={16} className="mr-2" /> Lưu ý
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>Vui lòng giữ nguyên nội dung chuyển khoản là mã đơn hàng <strong>{payment?.order_code}</strong>.</li>
              <li>Hệ thống sẽ tự động xác nhận trong vòng 1-3 phút sau khi bạn chuyển khoản thành công.</li>
              <li>Không tải lại trang trong quá trình giao dịch.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
