'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BriefcaseBusiness } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

export default function Header() {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user

  const handleLogout = async () => {
        await signOut({ redirect: false })
        toast.success('Đăng xuất thành công')
        router.push('/')
  }

  return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

                {/* LOGO */}
                <Link href="/"
                    className="flex items-center gap-3"
                >
                    <img
                        src="/assets/logo.png"
                        alt="JobReco Logo"
                        className="h-12 w-25 rounded-xl object-cover"
                    />
                </Link>

                {/* MENU */}
                <nav className="hidden items-center gap-8 md:flex">
  
                    <Link href="/"
                        className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
                    >
                        Trang Chủ
                    </Link>

                    <Link href="/cv"
                        className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
                    >
                        Đề Xuất
                    </Link>

                    <Link href="/pricing"
                        className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
                    >
                        Bảng Giá
                    </Link>
                </nav>

                {/* ACTIONS */}
                <div className="flex items-center gap-3">

                    {user ? (
                        <>
                            <button
                                onClick={() => router.push('/profile')}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                                Trang Cá Nhân
                            </button>

                            <button
                                onClick={handleLogout}
                                className="rounded-xl border-2 border-indigo-600 bg-white px-4 py-2 text-sm font-black text-black shadow-md transition hover:scale-105 hover:bg-slate-50"
                            >
                                Đăng xuất
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/auth/login"
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                                Đăng nhập
                            </Link>

                            <Link href="/auth/register"
                                className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:scale-105"
                            >
                                Bắt Đầu
                            </Link>
                        </>
                    )}

                </div>
            </div>
        </header>
    )
}