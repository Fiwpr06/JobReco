'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Check } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const getStrengthText = (score: number) => {
    if (score === 0) return "";
    if (score <= 2) return "Yếu";
    if (score <= 4) return "Trung bình";
    return "Mạnh";
  };
  const getStrengthColor = (score: number) => {
    if (score <= 2) return "bg-rose-500";
    if (score <= 4) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const pass = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const full_name = formData.get('full_name') as string;

    if (pass !== confirmPassword) {
      setErrors({ confirmPassword: "Mật khẩu xác nhận không khớp" });
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/v1/auth/register', { email, password: pass, full_name });
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

        {/* Main Content Info */}
        <div className="relative z-20 max-w-lg space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin [animation-duration:3s]" />
            Join the Network
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-indigo-600 via-indigo-900 to-cyan-600 dark:from-indigo-200 dark:via-white dark:to-cyan-200 bg-clip-text text-transparent">
              Bắt đầu Hành trình Tìm kiếm Tài năng của bạn
            </h1>
            <p className="text-muted text-base leading-relaxed">
              Tạo tài khoản ngay hôm nay để trải nghiệm công nghệ kết nối nhân sự thông minh, chính xác hàng đầu.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            {[
              "Hỗ trợ phân tích kỹ năng chuyên sâu từ CV.",
              "So khớp tự động bằng mô hình AI tiên tiến.",
              "Quản lý vòng đời ứng tuyển tinh gọn."
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-500">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto max-h-screen">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute left-10 bottom-0 h-96 w-96 rounded-full bg-cyan-500/5 dark:bg-cyan-600/10 blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 bg-surface/50 p-8 sm:p-10 rounded-[32px] border border-border shadow-2xl backdrop-blur-xl relative z-10">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-primary font-fraunces">Đăng ký tài khoản</h2>
            <p className="text-sm text-muted mt-2">Tham gia cùng JobReco ngay hôm nay.</p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-dim">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  required
                  placeholder="Họ và tên"
                  className="w-full rounded-2xl border border-border bg-surface/80 pl-11 pr-4 py-3 text-sm text-primary placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {errors.full_name && <p className="text-xs text-danger font-semibold px-2">{errors.full_name}</p>}
            </div>

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
                  className="w-full rounded-2xl border border-border bg-surface/80 pl-11 pr-4 py-3 text-sm text-primary placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {errors.email && <p className="text-xs text-danger font-semibold px-2">{errors.email}</p>}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full rounded-2xl border border-border bg-surface/80 pl-11 pr-12 py-3 text-sm text-primary placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-dim hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="px-2 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold tracking-wide uppercase text-slate-400">
                    <span>Độ mạnh mật khẩu</span>
                    <span className={strength <= 2 ? "text-rose-500" : strength <= 4 ? "text-amber-500" : "text-emerald-500"}>
                      {getStrengthText(strength)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 transition-all duration-300 ${
                          step <= strength ? getStrengthColor(strength) : "bg-slate-200 dark:bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              {errors.password && <p className="text-xs text-danger font-semibold px-2">{errors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-dim">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  placeholder="Xác nhận mật khẩu"
                  className="w-full rounded-2xl border border-border bg-surface/80 pl-11 pr-12 py-3 text-sm text-primary placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-dim hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-danger font-semibold px-2">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer group"
            >
              {loading ? (
                "Đang tạo tài khoản..."
              ) : (
                <>
                  Đăng ký <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted pt-2">
            Đã có tài khoản?
            <Link href="/auth/login" className="ml-1.5 font-bold text-indigo-500 hover:text-indigo-400 transition-colors">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
