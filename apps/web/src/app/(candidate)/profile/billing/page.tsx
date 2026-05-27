'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, Clock, Loader2, Sparkles, AlertCircle } from "lucide-react";

interface PaymentTransaction {
  id: number;
  order_code: string;
  amount: number;
  package_name: string;
  status: string;
  created_at: string;
}

export default function BillingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    
    const fetchHistory = async () => {
      try {
        const { data } = await api.get("/api/v1/payments/history");
        setHistory(data);
      } catch (err) {
        console.error("Failed to fetch payment history", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [session]);

  if (!session) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Vui lòng đăng nhập</h2>
        <p className="text-slate-500 mb-6">Bạn cần đăng nhập để xem thông tin gói và lịch sử thanh toán.</p>
        <Button onClick={() => router.push("/auth/login")} className="bg-indigo-600 hover:bg-indigo-700">Đăng nhập</Button>
      </div>
    );
  }

  const isPremium = (session.user as any)?.subscription_tier === 'premium';
  
  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          <CreditCard className="mr-3 h-8 w-8 text-indigo-500" /> Quản lý Gói & Thanh toán
        </h1>
        <p className="text-slate-500 mt-2">Xem thông tin gói hiện tại và lịch sử giao dịch của bạn.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Current Plan Card */}
        <div className="md:col-span-1 space-y-6">
          <div className={`rounded-2xl border ${isPremium ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white'} p-6 shadow-sm`}>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Gói hiện tại</h3>
            
            <div className="flex items-center mb-6">
              {isPremium ? (
                <div className="flex items-center text-indigo-700">
                  <Sparkles className="h-8 w-8 mr-3" />
                  <div>
                    <div className="text-2xl font-black">Premium</div>
                    <div className="text-sm font-medium opacity-80">Đầy đủ tính năng hệ thống</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center text-slate-700">
                  <div className="h-8 w-8 rounded bg-slate-200 mr-3 flex items-center justify-center font-bold text-slate-500">F</div>
                  <div>
                    <div className="text-2xl font-black">Miễn phí</div>
                    <div className="text-sm text-slate-500">Tính năng cơ bản</div>
                  </div>
                </div>
              )}
            </div>

            {isPremium && (session.user as any)?.premium_until && (
              <div className="bg-white rounded-xl p-4 border border-indigo-100 mb-6 flex items-start">
                <Calendar className="h-5 w-5 text-indigo-500 mr-3 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 mb-1">Ngày hết hạn</div>
                  <div className="font-semibold text-slate-900">{formatDate((session.user as any).premium_until)}</div>
                </div>
              </div>
            )}

            {!isPremium ? (
              <Button onClick={() => router.push("/pricing")} className="w-full bg-indigo-600 hover:bg-indigo-700">Nâng cấp ngay</Button>
            ) : (
              <Button onClick={() => router.push("/pricing")} variant="outline" className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-100">Gia hạn gói</Button>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Clock className="mr-2 h-5 w-5 text-slate-500" /> Lịch sử giao dịch
              </h3>
            </div>
            
            <div className="p-0">
              {loading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center p-12 text-slate-500">
                  <p>Chưa có giao dịch nào.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Mã đơn</th>
                        <th className="px-6 py-4 font-semibold">Ngày tạo</th>
                        <th className="px-6 py-4 font-semibold">Gói</th>
                        <th className="px-6 py-4 font-semibold">Số tiền</th>
                        <th className="px-6 py-4 font-semibold text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((tx) => (
                        <tr key={tx.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-6 py-4 font-mono text-slate-600">{tx.order_code}</td>
                          <td className="px-6 py-4 text-slate-600">{formatDate(tx.created_at)}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{tx.package_name === 'plan_premium' ? 'Premium 1T' : tx.package_name}</td>
                          <td className="px-6 py-4 font-medium">{tx.amount.toLocaleString()}đ</td>
                          <td className="px-6 py-4 text-right">
                            {tx.status === 'completed' ? (
                              <span className="bg-green-100 text-green-700 py-1 px-2.5 rounded-full text-xs font-bold">Thành công</span>
                            ) : tx.status === 'failed' ? (
                              <span className="bg-red-100 text-red-700 py-1 px-2.5 rounded-full text-xs font-bold">Thất bại</span>
                            ) : (
                              <span className="bg-amber-100 text-amber-700 py-1 px-2.5 rounded-full text-xs font-bold">Đang chờ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
