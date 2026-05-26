"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateJobPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<{id: number, name: string}[]>([]);
  
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
  };

  const removeSkill = (skillId: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s.skill_id !== skillId)
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/recruiter/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add Authorization header here from your auth store
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create job posting");
      }

      toast.success("Đăng tuyển thành công!");
      router.push("/recruiter/jobs"); // Redirect back to jobs list
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi tạo công việc.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-2xl text-primary">Tạo Tin Tuyển Dụng Mới</CardTitle>
          <CardDescription>Điền thông tin chi tiết để thu hút ứng viên phù hợp nhất.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Thông tin chung</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title_vi">Tiêu đề (Tiếng Việt) <span className="text-red-500">*</span></Label>
                  <Input id="title_vi" name="title_vi" value={formData.title_vi} onChange={handleInputChange} required placeholder="VD: Lập trình viên Backend Node.js" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title_en">Tiêu đề (Tiếng Anh)</Label>
                  <Input id="title_en" name="title_en" value={formData.title_en} onChange={handleInputChange} placeholder="VD: Backend Node.js Developer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_category">Ngành nghề</Label>
                  <Input id="job_category" name="job_category" value={formData.job_category} onChange={handleInputChange} placeholder="VD: IT - Phần mềm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_type">Loại hình</Label>
                  <Select value={formData.job_type} onValueChange={(val) => handleSelectChange("job_type", val)}>
                    <SelectTrigger>
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="job_address">Địa chỉ làm việc <span className="text-red-500">*</span></Label>
                  <Input id="job_address" name="job_address" value={formData.job_address} onChange={handleInputChange} required placeholder="VD: Tòa nhà X, Quận Y, TP.HCM" />
                </div>
              </div>
            </div>

            {/* Requirements & Salary */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Yêu cầu & Mức lương</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience_min_years">Kinh nghiệm tối thiểu (năm)</Label>
                  <Input id="experience_min_years" name="experience_min_years" type="number" step="0.5" min="0" value={formData.experience_min_years} onChange={handleInputChange} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience_max_years">Kinh nghiệm tối đa (năm)</Label>
                  <Input id="experience_max_years" name="experience_max_years" type="number" step="0.5" min="0" value={formData.experience_max_years} onChange={handleInputChange} placeholder="5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary_min_vnd">Lương tối thiểu (VND)</Label>
                  <Input id="salary_min_vnd" name="salary_min_vnd" type="number" min="0" value={formData.salary_min_vnd} onChange={handleInputChange} placeholder="10000000" disabled={formData.salary_is_negotiable} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary_max_vnd">Lương tối đa (VND)</Label>
                  <Input id="salary_max_vnd" name="salary_max_vnd" type="number" min="0" value={formData.salary_max_vnd} onChange={handleInputChange} placeholder="20000000" disabled={formData.salary_is_negotiable} />
                </div>
                <div className="flex items-center space-x-2 md:col-span-2 pt-2">
                  <Switch id="salary_is_negotiable" checked={formData.salary_is_negotiable} onCheckedChange={handleSwitchChange} />
                  <Label htmlFor="salary_is_negotiable" className="cursor-pointer">Lương thỏa thuận (Thương lượng)</Label>
                </div>
              </div>
            </div>

            {/* Detailed Descriptions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Chi tiết công việc</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="job_description_vi">Mô tả công việc <span className="text-red-500">*</span></Label>
                  <Textarea id="job_description_vi" name="job_description_vi" value={formData.job_description_vi} onChange={handleInputChange} required className="min-h-[120px]" placeholder="Nhập chi tiết các công việc ứng viên sẽ đảm nhận..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_requirements_vi">Yêu cầu ứng viên <span className="text-red-500">*</span></Label>
                  <Textarea id="job_requirements_vi" name="job_requirements_vi" value={formData.job_requirements_vi} onChange={handleInputChange} required className="min-h-[120px]" placeholder="Nhập các yêu cầu về kỹ năng, bằng cấp..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="benefit_vi">Quyền lợi</Label>
                  <Textarea id="benefit_vi" name="benefit_vi" value={formData.benefit_vi} onChange={handleInputChange} className="min-h-[100px]" placeholder="Bảo hiểm, thưởng lễ tết, du lịch..." />
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Kỹ năng yêu cầu <span className="text-red-500">*</span></h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map(skillReq => {
                    const skillName = availableSkills.find(s => s.id === skillReq.skill_id)?.name;
                    return (
                      <Badge key={skillReq.skill_id} variant="secondary" className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 flex items-center gap-1">
                        {skillName}
                        <button type="button" onClick={() => removeSkill(skillReq.skill_id)} className="hover:text-red-500 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  {formData.skills.length === 0 && (
                    <span className="text-muted-foreground text-sm italic">Chưa có kỹ năng nào được chọn</span>
                  )}
                </div>
                
                <div className="max-w-xs">
                  <Select onValueChange={(val) => addSkill(parseInt(val))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kỹ năng để thêm..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSkills.filter(s => !formData.skills.find(fs => fs.skill_id === s.id)).map(skill => (
                        <SelectItem key={skill.id} value={skill.id.toString()}>{skill.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Kỹ năng được sử dụng để Graph Neural Network (HGAT) tính toán điểm phù hợp (Match Score) với ứng viên.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
              <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isLoading ? "Đang xử lý..." : "Đăng Tin Tuyển Dụng"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
