'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const full_name = formData.get('full_name') as string;

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Mật khẩu xác nhận không khớp" });
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/v1/auth/register', { email, password, full_name });
      toast.success("Đăng ký thành công! Hãy đăng nhập.");
      router.push('/auth/login');
    } catch (err: any) {
      if (err.response?.status === 422) {
        const newErrors: Record<string, string> = {};
        err.response.data.detail?.forEach((d: any) => {
          const field = d.loc[d.loc.length - 1];
          newErrors[field] = d.msg;
        });
        setErrors(newErrors);
      } else {
        toast.error(err.response?.data?.detail || "Đăng ký thất bại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-[calc(100vh-130px)] items-center justify-center py-12 px-6 relative overflow-hidden">
      {/* Decorative Blur Backdrops */}
      <div className="absolute left-1/4 top-1/4 h-80 w-80 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none"></div>
      <div className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-md rounded-[32px] border border-border bg-surface/50 p-10 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center">
          <h1 className="text-4xl font-fraunces font-black text-white">
            Tạo tài khoản
          </h1>
          <p className="mt-4 text-muted">
            Tham gia cùng JobReco ngay hôm nay.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div>
            <input
              type="text"
              id="full_name"
              name="full_name"
              required
              placeholder="Họ và tên"
              className="w-full rounded-2xl border border-border-mid bg-elevated px-4 py-4 text-primary outline-none transition focus:border-indigo-500"
            />
            {errors.full_name && <p className="text-xs text-danger mt-1 font-medium">{errors.full_name}</p>}
          </div>

          <div>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="Email"
              className="w-full rounded-2xl border border-border-mid bg-elevated px-4 py-4 text-primary outline-none transition focus:border-indigo-500"
            />
            {errors.email && <p className="text-xs text-danger mt-1 font-medium">{errors.email}</p>}
          </div>

          <div>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="Mật khẩu"
              className="w-full rounded-2xl border border-border-mid bg-elevated px-4 py-4 text-primary outline-none transition focus:border-indigo-500"
            />
            {errors.password && <p className="text-xs text-danger mt-1 font-medium">{errors.password}</p>}
          </div>

          <div>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              placeholder="Xác nhận mật khẩu"
              className="w-full rounded-2xl border border-border-mid bg-elevated px-4 py-4 text-primary outline-none transition focus:border-indigo-500"
            />
            {errors.confirmPassword && <p className="text-xs text-danger mt-1 font-medium">{errors.confirmPassword}</p>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-2xl border-2 border-indigo-500 bg-indigo-600 py-4 text-lg font-black text-white shadow-lg transition hover:scale-[1.02] hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="mt-8 text-center text-muted">
          Đã có tài khoản?
          <Link href="/auth/login" className="ml-2 font-semibold text-indigo-400 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
