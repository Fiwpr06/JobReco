'use client';
import { useState } from 'react'
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation'
import { Bell, ChevronDown, LogOut, User, Upload, BriefcaseBusiness, Users, Target, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { useSession, signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
export default function DashboardTopbar() {
    const router = useRouter()
    const pathname = usePathname()
    const { data: session } = useSession()
    const user = session?.user

    const [open, setOpen] = useState(false)

    const handleLogout = async () => {
        await signOut({ redirect: false })
        toast.success('Đăng xuất thành công')
        router.push('/')
    }

    const role = user?.role
    const isRecruiterOrAdmin = role === 'admin' || role === 'recruiter'

    const { data: primaryCv } = useQuery({
        queryKey: ['primaryCv'],
        queryFn: async () => {
            const res = await api.get('/api/v1/cvs/primary')
            return res.data
        },
        enabled: !!session, // only fetch when logged in
        retry: false,
    })

    const allMenus = [
        {
            title: primaryCv ? 'Cập nhật CV' : 'Tải CV Lên',
            path: '/cv',
            icon: Upload,
            always: true,
        },
        {
            title: 'Kỹ Năng',
            path: '/skills',
            icon: Target,
            always: false, // only show when logged in & has CV
            show: !!session && !!primaryCv,
        },
        {
            title: 'Công Việc',
            path: '/jobs',
            icon: Briefcase,
            always: true, // always visible
        },
        {
            title: 'Tuyển Dụng',
            path: '/recruiter/dashboard',
            icon: Users,
            always: false,
            show: isRecruiterOrAdmin, // only for recruiter/admin
        },
    ]

    const menus = allMenus.filter(m => m.always || m.show)

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

                {/* LEFT */}
                <div className="flex items-center gap-12">

                    {/* LOGO */}
                    <Link href="/" className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-indigo-600 hover:bg-indigo-100 transition">
                        <BriefcaseBusiness className="h-7 w-7" />
                        <span className="text-lg font-black tracking-tight">JobReco</span>
                    </Link>

                    {/* NAVIGATION */}
                    <nav className="hidden items-center gap-3 lg:flex">
                        
                        {menus.map((menu) => {
                            const Icon = menu.icon

                            return (
                                <Link
                                    key={menu.title}
                                    href={menu.path}
                                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-medium transition border-2 ${
                                        pathname === menu.path
                                            ? 'border-indigo-600 bg-white text-indigo-600 shadow-lg'
                                            : 'border-transparent text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon size={18} />

                                    {menu.title}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-4">
                    {session ? (
                        <>
                            {/* NOTIFICATION */}
                            <button className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white transition hover:bg-slate-50">
                                
                                <Bell size={20} className="text-slate-700" />

                                <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500"></div>
                            </button>

                            {/* PROFILE */}
                            <div className="relative">
                                
                                <button
                                    onClick={() => setOpen(!open)}
                                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 transition hover:bg-slate-50"
                                >
                                
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-lg font-bold text-white">
                                        {user?.name?.charAt(0) || 'U'}
                                    </div>

                                    <div className="hidden text-left md:block">
                                        
                                        <h3 className="font-bold text-slate-900">
                                            {user?.name || 'User'}
                                        </h3>

                                        <p className="text-sm text-slate-500">
                                            Ứng viên
                                        </p>
                                    </div>

                                    <ChevronDown
                                        size={18}
                                        className={`text-slate-400 transition ${
                                            open ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>

                                {/* DROPDOWN */}
                                {open && (
                                    <div className="absolute right-0 top-16 w-64 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl">
                                        
                                        <Link href="/profile"
                                            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 transition hover:bg-slate-100"
                                        >
                                            <User size={18} />

                                            Trang Cá Nhân
                                        </Link>

                                        <button
                                            onClick={handleLogout}
                                            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-red-500 transition hover:bg-red-50"
                                        >
                                            <LogOut size={18} />

                                            Đăng Xuất
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <Link href="/auth/login" className="rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white transition hover:bg-indigo-700">
                            Đăng nhập
                        </Link>
                    )}
                </div>
            </div>
        </header>
    )
}