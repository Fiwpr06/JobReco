"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Check, Search, Sparkles, Briefcase, MapPin, DollarSign, Calendar, Eye, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

export default function CreateJobPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<{id: number, name: string}[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  
  useEffect(() => {
    // Fetch real skills from API
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/skills`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableSkills(data.map((s: any) => ({ id: s.id, name: s.name })));
        }
      })
      .catch(err => console.error("Failed to fetch skills:", err));
  }, []);

  const [formData, setFormData] = useState({
    title_vi: "",
    title_en: "",
    job_address: "",
    job_category: "",
    job_type: "Full-time",
    quantity: 1,
    salary_min_vnd: "",
    salary_max_vnd: "",
    salary_is_negotiable: false,
    experience_min_years: "",
    experience_max_years: "",
    job_description_vi: "",
    job_requirements_vi: "",
    benefit_vi: "",
    skills: [] as { skill_id: number, is_required: boolean }[]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, salary_is_negotiable: checked }));
  };

  const addSkill = (skillId: number) => {
    if (!formData.skills.find(s => s.skill_id === skillId)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, { skill_id: skillId, is_required: true }]
      }));
    }
    setSkillSearch("");
    setShowSkillDropdown(false);
  };

  const removeSkill = (skillId: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s.skill_id !== skillId)
    }));
  };

  const toggleSkillRequirement = (skillId: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map(s => s.skill_id === skillId ? { ...s, is_required: !s.is_required } : s)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Ensure numeric fields are parsed correctly
      const payload = {
        ...formData,
        quantity: parseInt(formData.quantity.toString()) || 1,
        salary_min_vnd: formData.salary_min_vnd ? parseInt(formData.salary_min_vnd.toString()) : null,
        salary_max_vnd: formData.salary_max_vnd ? parseInt(formData.salary_max_vnd.toString()) : null,
        experience_min_years: formData.experience_min_years ? parseFloat(formData.experience_min_years.toString()) : null,
        experience_max_years: formData.experience_max_years ? parseFloat(formData.experience_max_years.toString()) : null,
      };

      // Retrieve access token
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      const accessToken = session?.accessToken || "";

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/recruiter/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create job posting");
      }

      toast.success("Đăng tuyển thành công!");
      router.push("/recruiter/dashboard?view=postings"); // Redirect back to dashboard postings view
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi tạo công việc.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter skills based on search query and already selected skills
  const filteredSkills = availableSkills.filter(
    s => s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
         !formData.skills.find(fs => fs.skill_id === s.id)
  ).slice(0, 8);

  const formatSalary = (min: string, max: string, isNegotiable: boolean) => {
    if (isNegotiable) return "Thỏa thuận";
    if (!min && !max) return "Mức lương hấp dẫn";
    const formatMil = (val: string) => {
      const num = parseInt(val);
      if (isNaN(num)) return "";
      return (num / 1000000).toFixed(0) + " Tr";
    };
    if (min && max) return `${formatMil(min)} - ${formatMil(max)} VND`;
    if (min) return `Từ ${formatMil(min)} VND`;
    return `Đến ${formatMil(max)} VND`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Upper Glassmorphic Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 px-6 md:px-12 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900 flex items-center justify-center border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Tạo Tin Tuyển Dụng</h1>
            <p className="text-xs text-slate-500">Đăng tin tuyển dụng và tìm kiếm ứng viên bằng GNN AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-600 hover:text-slate-900 font-semibold">Hủy</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white px-5 py-2.5 rounded-xl shadow-md shadow-indigo-100 transition-all">
            {isLoading ? "Đang xử lý..." : "Đăng tin tuyển dụng"}
          </Button>
        </div>
      </header>

      {/* Workspace Split Layout */}
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Input Form (60%) */}
        <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. General Info */}
            <div className="space-y-5">
              <h3 className="text-base font-bold text-indigo-600 tracking-wide uppercase border-b border-slate-100 pb-3 flex items-center gap-2">
                <Briefcase className="w-4.5 h-4.5" /> 1. Thông tin chung
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="title_vi" className="font-bold text-slate-700">Tiêu đề (Tiếng Việt) <span className="text-rose-500">*</span></Label>
                  <Input id="title_vi" name="title_vi" value={formData.title_vi} onChange={handleInputChange} required placeholder="VD: Lập trình viên Backend Node.js" className="rounded-xl border-slate-200 py-5 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title_en" className="font-bold text-slate-700">Tiêu đề (Tiếng Anh)</Label>
                  <Input id="title_en" name="title_en" value={formData.title_en} onChange={handleInputChange} placeholder="VD: Backend Node.js Developer" className="rounded-xl border-slate-200 py-5 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="job_category" className="font-bold text-slate-700">Ngành nghề</Label>
                  <Input id="job_category" name="job_category" value={formData.job_category} onChange={handleInputChange} placeholder="VD: IT - Phần mềm" className="rounded-xl border-slate-200 py-5 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="job_type" className="font-bold text-slate-700">Loại hình</Label>
                  <Select value={formData.job_type} onValueChange={(val) => handleSelectChange("job_type", val || "")}>
                    <SelectTrigger className="rounded-xl border-slate-200 py-5 focus:ring-indigo-500">
                      <SelectValue placeholder="Chọn loại hình" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Freelance">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quantity" className="font-bold text-slate-700">Số lượng tuyển dụng</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" value={formData.quantity} onChange={handleInputChange} className="rounded-xl border-slate-200 py-5 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="job_address" className="font-bold text-slate-700">Địa chỉ làm việc <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <MapPin className="w-4.5 h-4.5" />
                    </span>
                    <Input id="job_address" name="job_address" value={formData.job_address} onChange={handleInputChange} required placeholder="VD: Tòa nhà Landmark 81, Bình Thạnh, TP.HCM" className="rounded-xl border-slate-200 pl-10 py-5 focus-visible:ring-indigo-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Compensation & Requirements */}
            <div className="space-y-5">
              <h3 className="text-base font-bold text-indigo-600 tracking-wide uppercase border-b border-slate-100 pb-3 flex items-center gap-2">
                <DollarSign className="w-4.5 h-4.5" /> 2. Mức lương & Yêu cầu kinh nghiệm
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="experience_min_years" className="font-bold text-slate-700">Kinh nghiệm tối thiểu (năm)</Label>
                  <Input id="experience_min_years" name="experience_min_years" type="number" step="0.5" min="0" value={formData.experience_min_years} onChange={handleInputChange} placeholder="0" className="rounded-xl border-slate-200 py-5 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="experience_max_years" className="font-bold text-slate-700">Kinh nghiệm tối đa (năm)</Label>
                  <Input id="experience_max_years" name="experience_max_years" type="number" step="0.5" min="0" value={formData.experience_max_years} onChange={handleInputChange} placeholder="5" className="rounded-xl border-slate-200 py-5 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salary_min_vnd" className="font-bold text-slate-700">Lương tối thiểu (VND)</Label>
                  <Input id="salary_min_vnd" name="salary_min_vnd" type="number" min="0" value={formData.salary_min_vnd} onChange={handleInputChange} placeholder="10000000" disabled={formData.salary_is_negotiable} className="rounded-xl border-slate-200 py-5 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salary_max_vnd" className="font-bold text-slate-700">Lương tối đa (VND)</Label>
                  <Input id="salary_max_vnd" name="salary_max_vnd" type="number" min="0" value={formData.salary_max_vnd} onChange={handleInputChange} placeholder="20000000" disabled={formData.salary_is_negotiable} className="rounded-xl border-slate-200 py-5 focus-visible:ring-indigo-500" />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2 pt-2">
                  <input 
                    id="salary_is_negotiable" 
                    type="checkbox"
                    checked={formData.salary_is_negotiable} 
                    onChange={(e) => handleSwitchChange(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                  />
                  <Label htmlFor="salary_is_negotiable" className="cursor-pointer text-slate-700 font-bold select-none text-sm">Lương thỏa thuận (Thương lượng)</Label>
                </div>
              </div>
            </div>

            {/* 3. Detailed Descriptions */}
            <div className="space-y-5">
              <h3 className="text-base font-bold text-indigo-600 tracking-wide uppercase border-b border-slate-100 pb-3 flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5" /> 3. Mô tả chi tiết công việc
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="job_description_vi" className="font-bold text-slate-700">Mô tả công việc <span className="text-rose-500">*</span></Label>
                  <Textarea id="job_description_vi" name="job_description_vi" value={formData.job_description_vi} onChange={handleInputChange} required className="min-h-[140px] rounded-xl border-slate-200 focus-visible:ring-indigo-500" placeholder="Nhập chi tiết các công việc ứng viên sẽ đảm nhận..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="job_requirements_vi" className="font-bold text-slate-700">Yêu cầu ứng viên <span className="text-rose-500">*</span></Label>
                  <Textarea id="job_requirements_vi" name="job_requirements_vi" value={formData.job_requirements_vi} onChange={handleInputChange} required className="min-h-[140px] rounded-xl border-slate-200 focus-visible:ring-indigo-500" placeholder="Nhập các yêu cầu về kỹ năng, bằng cấp, kinh nghiệm..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="benefit_vi" className="font-bold text-slate-700">Quyền lợi ứng viên</Label>
                  <Textarea id="benefit_vi" name="benefit_vi" value={formData.benefit_vi} onChange={handleInputChange} className="min-h-[100px] rounded-xl border-slate-200 focus-visible:ring-indigo-500" placeholder="Bảo hiểm, thưởng tết, môi trường làm việc..." />
                </div>
              </div>
            </div>

            {/* 4. Skills Selector */}
            <div className="space-y-5">
              <h3 className="text-base font-bold text-indigo-600 tracking-wide uppercase border-b border-slate-100 pb-3 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5" /> 4. Kỹ năng Matching AI
              </h3>
              
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Chọn các kỹ năng tối quan trọng cho công việc này. Mô hình **Graph Neural Network** của JobReco sẽ đối sánh trực tiếp các kỹ năng này với hồ sơ ứng viên để đề xuất kết quả tốt nhất.
                </p>

                {/* Skill input search with suggestions */}
                <div className="relative max-w-md">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <Input 
                      type="text" 
                      placeholder="Tìm kiếm kỹ năng (VD: Python, React)..." 
                      value={skillSearch}
                      onChange={(e) => {
                        setSkillSearch(e.target.value);
                        setShowSkillDropdown(true);
                      }}
                      onFocus={() => setShowSkillDropdown(true)}
                      className="rounded-xl border-slate-200 pl-10 py-5 focus-visible:ring-indigo-500" 
                    />
                  </div>

                  {showSkillDropdown && skillSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {filteredSkills.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500 italic text-center">Không tìm thấy kỹ năng phù hợp</div>
                      ) : (
                        filteredSkills.map(skill => (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => addSkill(skill.id)}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between border-b border-slate-50"
                          >
                            <span className="font-semibold text-slate-800">{skill.name}</span>
                            <Plus className="w-3.5 h-3.5 text-indigo-600" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Skills Badges List */}
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Kỹ năng đã chọn ({formData.skills.length})</Label>
                  <div className="flex flex-wrap gap-2.5">
                    {formData.skills.map(skillReq => {
                      const skillObj = availableSkills.find(s => s.id === skillReq.skill_id);
                      if (!skillObj) return null;
                      return (
                        <div 
                          key={skillReq.skill_id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm transition-all ${
                            skillReq.is_required
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span className="text-xs font-bold">{skillObj.name}</span>
                          <button 
                            type="button"
                            onClick={() => toggleSkillRequirement(skillReq.skill_id)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                              skillReq.is_required
                                ? "bg-indigo-200 text-indigo-800 hover:bg-indigo-300"
                                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            }`}
                            title="Nhấp để đổi trạng thái"
                          >
                            {skillReq.is_required ? "Bắt buộc" : "Ưu tiên"}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => removeSkill(skillReq.skill_id)} 
                            className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {formData.skills.length === 0 && (
                      <span className="text-slate-400 text-sm italic">Chưa chọn kỹ năng nào</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </form>
        </section>

        {/* RIGHT COLUMN: Sticky Real-time Candidate View Mockup (40%) */}
        <section className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4.5 h-4.5" /> Xem trước tin tuyển dụng
            </h3>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">LIVE UPDATE</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-md mx-auto">
            {/* Top banner styling */}
            <div className="h-20 bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 p-4 flex items-end">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center text-indigo-600 font-black text-xl translate-y-6">
                C
              </div>
            </div>

            <div className="p-6 pt-10 space-y-6">
              {/* Header Info */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase">
                  {formData.job_category || "Chưa phân loại"}
                </span>
                <h4 className="text-lg font-bold text-slate-900 leading-snug">
                  {formData.title_vi || "Tiêu đề tin tuyển dụng"}
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    <Briefcase className="w-3 h-3" /> {formData.job_type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    <MapPin className="w-3 h-3" /> {formData.job_address.split(",")[0] || "Địa chỉ"}
                  </span>
                </div>
              </div>

              {/* Dynamic Job Specifications */}
              <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Mức lương</span>
                  <p className="text-xs font-bold text-slate-900">
                    {formatSalary(formData.salary_min_vnd, formData.salary_max_vnd, formData.salary_is_negotiable)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Kinh nghiệm</span>
                  <p className="text-xs font-bold text-slate-900">
                    {formData.experience_min_years || formData.experience_max_years
                      ? `${formData.experience_min_years || "0"} - ${formData.experience_max_years || "Không yêu cầu"} năm`
                      : "Không yêu cầu"}
                  </p>
                </div>
              </div>

              {/* Match Score Indicator (Visualizing how candidate sees it) */}
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100/50 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Điểm tương thích AI (Ví dụ)
                  </span>
                  <span className="font-black text-indigo-700">92% Match</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: "92%" }} />
                </div>
              </div>

              {/* Requirements & Skills (Visualizing dynamically) */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Mô tả tóm tắt</span>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {formData.job_description_vi || "Nội dung mô tả công việc sẽ hiển thị tại đây khi bạn nhập."}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Kỹ năng kết nối (AI Matching)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.skills.map(s => {
                      const skillObj = availableSkills.find(sk => sk.id === s.skill_id);
                      if (!skillObj) return null;
                      return (
                        <span 
                          key={s.skill_id} 
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            s.is_required 
                              ? "bg-indigo-100 text-indigo-800" 
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {skillObj.name} {s.is_required && "*"}
                        </span>
                      );
                    })}
                    {formData.skills.length === 0 && (
                      <span className="text-slate-400 text-[10px] italic">Chưa cấu hình kỹ năng AI matching</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <button 
                type="button" 
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition-all text-center flex items-center justify-center gap-1.5"
              >
                Ứng tuyển ngay <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
