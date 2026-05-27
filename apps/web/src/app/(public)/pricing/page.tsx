"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, Sparkles, Building2, User, Zap } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const pricingData = {
  tiers: [
    {
      id: "free",
      name: "Free",
      target: "Ứng viên tìm việc",
      icon: <User className="w-6 h-6 text-slate-600" />,
      price: 0,
      billing: "Forever free",
      price_yearly: 0,
      billing_yearly: "Forever free",
      features: [
        "✅ Upload 3 CVs/tháng",
        "✅ Hệ thống matching cơ bản",
        "✅ Xem top 10 công việc phù hợp",
        "✅ Skill extraction",
        "❌ Giải thích chi tiết từ hệ thống",
        "❌ Learning Roadmap",
        "❌ Priority matching"
      ],
      cta: "Bắt đầu miễn phí",
      highlight: false
    },
    {
      id: "premium",
      name: "Premium",
      target: "Ứng viên chuyên nghiệp",
      icon: <Sparkles className="w-6 h-6 text-indigo-600" />,
      price: 59000,
      billing: "59k VND/tháng",
      price_yearly: 590000,
      billing_yearly: "590k VND/năm (tiết kiệm 17%)",
      features: [
        "✅ Unlimited CV uploads",
        "✅ Giải thích chi tiết từ hệ thống",
        "✅ Personalized Learning Roadmap",
        "✅ Skill Gap Analysis",
        "✅ Priority matching (top 50 jobs)",
        "✅ Email alerts khi có job phù hợp",
        "✅ Profile visibility boost",
        "✅ 1-on-1 career consultation/quý"
      ],
      cta: "Nâng cấp Premium",
      highlight: true,
      badge: "🔥 Phổ biến nhất"
    },
    {
      id: "enterprise",
      name: "B2B SaaS",
      target: "Doanh nghiệp tuyển dụng",
      icon: <Building2 className="w-6 h-6 text-purple-400" />,
      price: null,
      billing: "Custom pricing",
      price_yearly: null,
      billing_yearly: "Custom pricing",
      features: [
        "✅ Recruiter Dashboard",
        "✅ Hệ thống xếp hạng ứng viên",
        "✅ Skill Heatmap Analytics",
        "✅ Bulk CV screening (1000+ CVs)",
        "✅ API Integration",
        "✅ Đào tạo mô hình hệ thống tùy chỉnh",
        "✅ White-label solution",
        "✅ Dedicated support",
        "✅ Advanced analytics & reporting",
        "✅ ATS integration (Greenhouse, Lever)"
      ],
      cta: "Liên hệ Sales",
      highlight: false
    }
  ]
};

const comparisonFeatures = [
  { name: "CV uploads", free: "3", premium: "∞", enterprise: "∞" },
  { name: "Job matches", free: "10", premium: "50", enterprise: "All" },
  { name: "Giải thích từ hệ thống", free: "❌", premium: "✅", enterprise: "✅" },
  { name: "Roadmap", free: "❌", premium: "✅", enterprise: "✅" },
  { name: "Recruiter Dashboard", free: "❌", premium: "❌", enterprise: "✅" },
  { name: "API Integration", free: "❌", premium: "❌", enterprise: "✅" },
  { name: "Analytics Heatmap", free: "❌", premium: "❌", enterprise: "✅" },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleCtaClick = (tierId: string) => {
    if (tierId === 'enterprise') {
      window.location.href = 'mailto:contact@example.com';
      return;
    }
    
    if (tierId === 'free') {
      if (session) router.push('/cv');
      else router.push('/auth/login');
      return;
    }

    // premium plan
    if (!session) {
      router.push(`/auth/login?callbackUrl=/pricing`);
      return;
    }
    router.push(`/checkout?plan=${tierId}`);
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "Custom";
    if (price === 0) return "0đ";
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const renderFeatureString = (str: string) => {
    const isCheck = str.startsWith('✅');
    const text = str.replace(/^[✅❌]\s*/, '');
    return (
      <li className="flex items-start gap-3 text-sm">
        <span className="mt-0.5 shrink-0">
          {isCheck ? (
            <Check className="w-4 h-4 text-emerald-500 " />
          ) : (
            <X className="w-4 h-4 text-slate-400" />
          )}
        </span>
        <span className={isCheck ? "text-slate-700" : "text-slate-400"}>{text}</span>
      </li>
    );
  };

  const renderComparisonValue = (val: string) => {
    if (val === '✅') return <Check className="w-5 h-5 text-emerald-500 mx-auto " />;
    if (val === '❌') return <X className="w-5 h-5 text-slate-400 mx-auto" />;
    return <span className="font-bold text-slate-700">{val}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-mono py-20 px-4 relative overflow-hidden">
      {/* BACKGROUND GLOWS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-slate-900 mb-6 drop-shadow-sm tracking-tight"
          >
            Nâng tầm sự nghiệp với <span className="text-indigo-600">Hệ thống Matching</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 max-w-2xl mx-auto mb-10 text-lg"
          >
            Chọn gói dịch vụ phù hợp để khai mở tối đa sức mạnh của thuật toán Graph Neural Network (HGAT).
          </motion.p>

          {/* TOGGLE */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4"
          >
            <span className={`font-bold ${!isYearly ? 'text-slate-900' : 'text-slate-500'}`}>Hàng tháng</span>
            <button 
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-16 h-8 rounded-full bg-slate-100 border border-slate-300 p-1 flex items-center transition-colors hover:border-indigo-600"
            >
              <motion.div 
                className="w-6 h-6 rounded-full bg-cyan-400 shadow-md"
                layout
                animate={{ x: isYearly ? 32 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`font-bold flex items-center gap-2 ${isYearly ? 'text-slate-900' : 'text-slate-500'}`}>
              Hàng năm 
              <span className="text-xs bg-indigo-600/20 text-indigo-600 border border-indigo-600/30 px-2 py-0.5 rounded-full whitespace-nowrap animate-pulse">
                Save 17%
              </span>
            </span>
          </motion.div>
        </div>

        {/* PRICING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 max-w-5xl mx-auto">
          {pricingData.tiers.map((tier, idx) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1, duration: 0.6, ease: "easeOut" }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              className={`relative bg-white rounded-2xl border ${
                tier.highlight 
                  ? 'border-indigo-600 shadow-xl shadow-indigo-600/20' 
                  : 'border-slate-200 hover:border-slate-400'
              } flex flex-col overflow-hidden`}
            >
              {tier.highlight && (
                <div className="absolute top-0 left-0 w-full bg-indigo-600 text-black text-xs font-bold text-center py-1.5 uppercase tracking-widest">
                  {tier.badge}
                </div>
              )}
              
              <div className={`p-8 flex-1 flex flex-col ${tier.highlight ? 'pt-10' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  {tier.icon}
                  <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                </div>
                <div className="text-sm text-slate-500 mb-6">{tier.target}</div>

                <div className="mb-6 h-20">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isYearly ? 'yearly' : 'monthly'}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-black text-slate-900 tracking-tight">
                          {formatPrice(isYearly ? tier.price_yearly : tier.price)}
                        </span>
                        {tier.price !== null && (
                          <span className="text-slate-500 mb-1">/{isYearly ? 'năm' : 'tháng'}</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        {isYearly ? tier.billing_yearly : tier.billing}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <button 
                  onClick={() => handleCtaClick(tier.id)}
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all mb-8 ${
                  tier.highlight 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/30' 
                    : 'bg-slate-100 border border-slate-300 text-slate-900 hover:bg-slate-200'
                }`}>
                  {tier.cta} <ArrowRight className="w-4 h-4" />
                </button>

                <div className="space-y-4 flex-1">
                  <div className="text-xs font-bold tracking-widest text-slate-500 mb-4">INCLUDES:</div>
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <React.Fragment key={i}>
                        {renderFeatureString(feature)}
                      </React.Fragment>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* COMPARISON TABLE */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 tracking-widest flex items-center justify-center gap-3">
              <Zap className="w-5 h-5 text-indigo-600" /> SO SÁNH CHI TIẾT
            </h2>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mt-4"></div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-20">
                <tr>
                  <th className="p-4 font-bold text-slate-600 text-sm">Feature</th>
                  <th className="p-4 font-bold text-slate-900 text-center w-1/4">Free</th>
                  <th className="p-4 font-bold text-indigo-600 text-center w-1/4">Premium</th>
                  <th className="p-4 font-bold text-purple-400 text-center w-1/4">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feat, idx) => (
                  <tr key={idx} className="border-b border-slate-200/50 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-700 font-medium">{feat.name}</td>
                    <td className="p-4 text-center">{renderComparisonValue(feat.free)}</td>
                    <td className="p-4 text-center">{renderComparisonValue(feat.premium)}</td>
                    <td className="p-4 text-center">{renderComparisonValue(feat.enterprise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}
