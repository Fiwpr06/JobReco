'use client';

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const attempts = parseInt(localStorage.getItem('login_attempts') || '0');
    if (attempts > 5) {
      toast.error('Quá nhiều lần thử thất bại. Vui lòng thử lại sau.');
      setLoading(false);
      return;
    }

    try {
      const res = await signIn('credentials', {
        username: email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Email hoặc mật khẩu không chính xác");
        localStorage.setItem('login_attempts', (attempts + 1).toString());
      } else {
        localStorage.removeItem('login_attempts');
        toast.success("Đăng nhập thành công!");
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại.");
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
          <h1 className="text-4xl font-black text-white font-fraunces">
            Đăng nhập
          </h1>
          <p className="mt-4 text-muted">
            Chào mừng quay trở lại với JobReco.
          </p>
        </div>

        {/* SOCIAL */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <button 
            type="button"
            onClick={() => toast.info("Đang phát triển phương thức đăng nhập này")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border-mid px-4 py-3 font-medium text-primary transition hover:bg-elevated cursor-pointer"
          >
            Github
          </button>
          <button 
            type="button"
            onClick={() => toast.info("Đang phát triển phương thức đăng nhập này")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border-mid px-4 py-3 font-medium text-primary transition hover:bg-elevated cursor-pointer"
          >
            Google
          </button>
        </div>

        {/* DIVIDER */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-border-mid"></div>
          <span className="text-sm text-muted font-medium">hoặc</span>
          <div className="h-px flex-1 bg-border-mid"></div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="Email"
              className="w-full rounded-2xl border border-border-mid bg-elevated px-4 py-4 text-primary outline-none transition focus:border-indigo-500"
            />
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
          </div>

          {error && (
            <p className="text-sm text-danger font-medium">{error}</p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-2xl border-2 border-indigo-500 bg-indigo-600 py-4 text-lg font-black text-white shadow-lg transition hover:scale-[1.02] hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-8 text-center text-muted">
          Chưa có tài khoản?
          <Link href="/auth/register" className="ml-2 font-semibold text-indigo-400 hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
