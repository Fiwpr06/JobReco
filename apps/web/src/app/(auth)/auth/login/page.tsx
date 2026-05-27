'use client';

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Cpu, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const attempts = parseInt(localStorage.getItem('login_attempts') || '0');

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
        router.push('/profile');
        router.refresh();
      }
    } catch (err) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-base text-primary font-sans overflow-hidden">
      {/* LEFT COLUMN: Visual & Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-50/30 dark:bg-indigo-950/10 items-center justify-center p-12 overflow-hidden border-r border-border">
        
        {/* Animated Grid / Dots (GNN Simulation) */}
        <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Floating AI Match Mockup Card */}
        <div className="absolute top-[25%] right-[15%] p-4 rounded-2xl bg-surface/90 border border-border shadow-2xl backdrop-blur-md animate-bounce [animation-duration:8s] z-10 w-64">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg">
              AI
            </div>
            <div>
              <h4 className="text-sm font-bold text-primary">Matching Recommendation</h4>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Match Score: 98%</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-[20%] left-[10%] p-4 rounded-2xl bg-surface/90 border border-border shadow-2xl backdrop-blur-md animate-bounce [animation-duration:6s] z-10 w-56">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></div>
            <p className="text-xs text-muted">Graph Neural Network active</p>
          </div>
        </div>

        {/* Main Content Info */}
        <div className="relative z-20 max-w-lg space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin [animation-duration:3s]" />
            AI-Driven Matching Platform
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-indigo-600 via-indigo-900 to-cyan-600 dark:from-indigo-200 dark:via-white dark:to-cyan-200 bg-clip-text text-transparent">
              Khám phá Cơ hội Việc làm với Trí tuệ Đồ thị
            </h1>
            <p className="text-muted text-base leading-relaxed">
              Hệ thống Graph Neural Network kết nối dữ liệu hồ sơ và nhu cầu doanh nghiệp thời gian thực. Định hình tương lai tuyển dụng chính xác, nhanh chóng.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-surface/50 border border-border">
              <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">95%+</h3>
              <p className="text-xs text-muted mt-1">Độ chính xác đề xuất</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface/50 border border-border">
              <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400">10k+</h3>
              <p className="text-xs text-muted mt-1">Hồ sơ được chuẩn hóa</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute left-10 bottom-0 h-96 w-96 rounded-full bg-cyan-500/5 dark:bg-cyan-600/10 blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 bg-surface/50 p-8 sm:p-10 rounded-[32px] border border-border shadow-2xl backdrop-blur-xl relative z-10">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-primary font-fraunces">Đăng nhập</h2>
            <p className="text-sm text-muted mt-2">Chào mừng quay trở lại với JobReco.</p>
          </div>

          {/* SOCIAL LOGIN */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => toast.info("Đang phát triển phương thức đăng nhập qua Github")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 font-semibold text-sm hover:bg-elevated transition-all cursor-pointer text-primary"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg> Github
            </button>
            <button
              type="button"
              onClick={() => toast.info("Đang phát triển phương thức đăng nhập qua Google")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 font-semibold text-sm hover:bg-elevated transition-all cursor-pointer text-primary"
            >
              <svg className="w-4 h-4 fill-current text-rose-500" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.524 0-6.386-2.862-6.386-6.386s2.862-6.386 6.386-6.386c1.577 0 3.003.574 4.114 1.525l3.057-3.057C18.995 1.83 15.82 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.8 0 12.24-5.44 12.24-12.24 0-.765-.077-1.53-.23-2.22H12.24z"/>
              </svg> Google
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border"></div>
            <span className="text-xs text-dim font-semibold uppercase tracking-wider">hoặc đăng nhập bằng</span>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-dim">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="Địa chỉ Email"
                  className="w-full rounded-2xl border border-border bg-surface/80 pl-11 pr-4 py-3.5 text-sm text-primary placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-dim">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  required
                  placeholder="Mật khẩu"
                  className="w-full rounded-2xl border border-border bg-surface/80 pl-11 pr-12 py-3.5 text-sm text-primary placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-dim hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-danger font-semibold bg-danger/10 border border-danger/20 px-3 py-2 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></span>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer group"
            >
              {loading ? (
                "Đang xác thực..."
              ) : (
                <>
                  Đăng nhập <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted pt-2">
            Chưa có tài khoản?
            <Link href="/auth/register" className="ml-1.5 font-bold text-indigo-500 hover:text-indigo-400 transition-colors">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
