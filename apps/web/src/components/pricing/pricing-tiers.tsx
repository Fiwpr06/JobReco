"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PricingTiers() {
  const [isAnnual, setIsAnnual] = useState(false);

  const tiers = [
    {
      name: "CƠ BẢN",
      target: "Dành cho Ứng viên",
      price: "0đ",
      description: "Các tính năng cơ bản để bắt đầu.",
      features: [
        { name: "Tải lên 3 CV/tháng", included: true },
        { name: "Ghép nối cơ bản", included: true },
        { name: "Xem top 10 công việc", included: true },
        { name: "Giải thích từ Hệ thống", included: false },
        { name: "Skill Roadmap", included: false },
        { name: "Ghép nối ưu tiên", included: false },
      ],
      buttonText: "Gói Hiện Tại",
      highlighted: false,
    },
    {
      name: "PREMIUM",
      target: "Dành cho Ứng viên",
      price: isAnnual ? "49k" : "59k",
      billingPeriod: isAnnual ? "/tháng (trả hàng năm)" : "/tháng",
      description: "Mọi thứ bạn cần để tìm được công việc mơ ước.",
      features: [
        { name: "Tải lên CV không giới hạn", included: true },
        { name: "Ghép nối cơ bản", included: true },
        { name: "Xem tất cả công việc", included: true },
        { name: "Giải thích từ Hệ thống", included: true },
        { name: "Skill Roadmap", included: true },
        { name: "Ghép nối ưu tiên", included: true },
      ],
      buttonText: "Nâng cấp Premium",
      highlighted: true,
    },
    {
      name: "DOANH NGHIỆP",
      target: "Dành cho Công ty",
      price: "Liên hệ",
      description: "Các công cụ nâng cao cho nhà tuyển dụng.",
      features: [
        { name: "Dashboard nhà tuyển dụng", included: true },
        { name: "Lọc ứng viên hàng loạt", included: true },
        { name: "Quyền truy cập API", included: true },
        { name: "Tích hợp tùy chỉnh", included: true },
        { name: "Hỗ trợ chuyên sâu", included: true },
      ],
      buttonText: "Liên hệ Sales",
      highlighted: false,
    },
  ];

  return (
    <section className="py-20 bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">
            BẢNG GIÁ
          </h2>
          <p className="text-slate-600 text-lg">
            Dù bạn là ứng viên đang tìm kiếm công việc phù hợp, hay doanh nghiệp đang mở rộng quy mô tuyển dụng.
          </p>
          
          {/* Billing Toggle */}
          <div className="mt-8 flex justify-center items-center gap-4">
            <span className={`text-sm font-medium ${!isAnnual ? "text-slate-900" : "text-slate-500"}`}>Hàng tháng</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-12 items-center rounded-full bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-slate-50"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-indigo-600 transition-transform ${isAnnual ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-medium flex items-center gap-2 ${isAnnual ? "text-slate-900" : "text-slate-500"}`}>
              Hàng năm <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded border border-indigo-200">Tiết kiệm 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mt-12">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className={`relative rounded-3xl border ${
                tier.highlighted ? "border-indigo-600 bg-white shadow-2xl shadow-indigo-600/15 md:scale-105 z-10" : "border-slate-200 bg-white shadow-sm"
              } p-8 flex flex-col transition-all duration-300 hover:shadow-xl`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-indigo-500/20">
                    Phổ biến nhất
                  </span>
                </div>
              )}
              
              <div className="mb-8 mt-2">
                <h3 className={`text-xl font-black mb-2 ${tier.highlighted ? "text-slate-900" : "text-slate-800"}`}>{tier.name}</h3>
                <p className="text-sm font-semibold text-indigo-600 mb-6">{tier.target}</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-black text-slate-900">{tier.price}</span>
                  {tier.billingPeriod && (
                    <span className="text-slate-500 font-medium">{tier.billingPeriod}</span>
                  )}
                </div>
                <p className="text-slate-600 text-sm mt-4 h-10">{tier.description}</p>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature.name} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? "text-slate-700 font-medium" : "text-slate-400"}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={tier.highlighted ? "default" : "outline"}
                className={`w-full font-bold h-12 transition-all rounded-xl ${
                  tier.highlighted 
                    ? "bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:scale-[1.02] shadow-lg shadow-indigo-500/25 border-0 text-base" 
                    : "border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600 hover:bg-slate-50 text-base"
                }`}
                onClick={() => {
                  if (tier.name === "DOANH NGHIỆP") window.location.href = "mailto:sales@jobreco.com";
                }}
              >
                {tier.buttonText}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
