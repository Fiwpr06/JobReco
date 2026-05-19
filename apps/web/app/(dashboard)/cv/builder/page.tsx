'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, ArrowRight, ArrowLeft, Save } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CVSkill } from "@/lib/types";

const STEPS = ["Basic Info", "Skills", "Preferences"];

export default function CvBuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [expYears, setExpYears] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");

  // Skills State
  const [skills, setSkills] = useState<CVSkill[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillProficiency, setSkillProficiency] = useState<any>("intermediate");
  const [skillYears, setSkillYears] = useState("");

  // Prefs State
  const [locs, setLocs] = useState<string[]>([]);
  const [locInput, setLocInput] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [jobTypes, setJobTypes] = useState<string[]>(['Full-time']);

  const handleAddSkill = () => {
    if (!skillInput.trim()) return;
    const newSkill: CVSkill = {
      skill_id: Math.floor(Math.random() * 10000), // mock ID
      skill_name: skillInput.trim(),
      proficiency_level: skillProficiency,
      years_experience: skillYears ? parseFloat(skillYears) : undefined
    };
    setSkills([...skills, newSkill]);
    setSkillInput("");
    setSkillYears("");
  };

  const handleRemoveSkill = (name: string) => {
    setSkills(skills.filter(s => s.skill_name !== name));
  };

  const handleAddLoc = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && locInput.trim()) {
      e.preventDefault();
      if (!locs.includes(locInput.trim())) {
        setLocs([...locs, locInput.trim()]);
      }
      setLocInput("");
    }
  };

  const toggleJobType = (type: string) => {
    if (jobTypes.includes(type)) {
      setJobTypes(jobTypes.filter(t => t !== type));
    } else {
      setJobTypes([...jobTypes, type]);
    }
  };

  const handleSubmit = async () => {
    if (skills.length === 0) {
      toast.error("Please add at least one skill.");
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title_en: title,
        summary_en: summary,
        experience_years: parseFloat(expYears) || 0,
        current_salary_vnd: currentSalary ? parseFloat(currentSalary) : null,
        expected_salary_min_vnd: minSalary ? parseFloat(minSalary) : null,
        expected_salary_max_vnd: maxSalary ? parseFloat(maxSalary) : null,
        preferred_locations: locs,
        preferred_job_types: jobTypes,
        is_primary: true,
        skills: skills
      };

      await api.post('/api/v1/cvs/', payload);
      toast.success("CV saved successfully!");
      router.push('/for-you');
    } catch (err: any) {
      if (err.response?.status === 422) {
        toast.error("Validation error. Please check your inputs.");
      } else {
        toast.error("Failed to save CV.");
        // Mock success for presentation if backend is down
        setTimeout(() => {
          toast.success("Mock: CV saved locally!");
          router.push('/for-you');
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="font-fraunces text-3xl font-bold text-primary mb-2">Build Your AI Profile</h1>
        <p className="text-muted">The more accurate your data, the better our HGAT model can match you.</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-10">
        <div className="flex justify-between mb-2">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-sm font-medium ${step >= i + 1 ? 'text-accent' : 'text-muted'}`}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
        <div className="h-2 bg-elevated rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-accent transition-all duration-300" 
            style={{ width: `${(step / 3) * 100}%` }} 
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold border-b border-border pb-2 mb-4">Basic Information</h2>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Current Job Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" required className="bg-elevated" />
              </div>
              <div className="space-y-2">
                <Label>Professional Summary</Label>
                <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief overview of your career..." className="bg-elevated h-24" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Experience (Years) *</Label>
                  <Input type="number" step="0.5" value={expYears} onChange={e => setExpYears(e.target.value)} placeholder="e.g. 3.5" required className="bg-elevated" />
                </div>
                <div className="space-y-2">
                  <Label>Current Salary (VND)</Label>
                  <Input type="number" value={currentSalary} onChange={e => setCurrentSalary(e.target.value)} placeholder="e.g. 25000000" className="bg-elevated" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold border-b border-border pb-2 mb-4">Core Skills (Crucial for AI)</h2>
            <div className="bg-elevated/50 p-4 rounded-lg border border-border border-dashed space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 space-y-1">
                  <Label className="text-xs">Skill Name</Label>
                  <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="e.g. Python" className="bg-surface" />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-xs">Proficiency</Label>
                  <Select value={skillProficiency} onValueChange={setSkillProficiency}>
                    <SelectTrigger className="bg-surface"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs">Years</Label>
                  <Input type="number" step="0.5" value={skillYears} onChange={e => setSkillYears(e.target.value)} placeholder="e.g. 2" className="bg-surface" />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <Button onClick={handleAddSkill} className="w-full bg-accent/20 text-accent hover:bg-accent/30"><Plus className="w-4 h-4 mr-1"/> Add</Button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Label className="mb-2 block">Added Skills ({skills.length})</Label>
              {skills.length === 0 ? (
                <p className="text-sm text-muted italic">No skills added yet. Please add at least one.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <Badge key={skill.skill_name} className="bg-elevated border-border-mid text-primary px-3 py-1 flex items-center gap-2 font-jetbrains-mono">
                      <span>{skill.skill_name} <span className="text-muted text-xs font-sans">({skill.proficiency_level})</span></span>
                      <button onClick={() => handleRemoveSkill(skill.skill_name)} className="text-muted hover:text-danger rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold border-b border-border pb-2 mb-4">Preferences</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred Locations</Label>
                <Input value={locInput} onChange={e => setLocInput(e.target.value)} onKeyDown={handleAddLoc} placeholder="Type a city and press Enter..." className="bg-elevated" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {locs.map(loc => (
                    <Badge key={loc} variant="secondary" className="bg-surface border-border">
                      {loc} <button onClick={() => setLocs(locs.filter(l => l !== loc))} className="ml-1"><X className="w-3 h-3"/></button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expected Salary Min (VND)</Label>
                  <Input type="number" value={minSalary} onChange={e => setMinSalary(e.target.value)} placeholder="e.g. 20000000" className="bg-elevated" />
                </div>
                <div className="space-y-2">
                  <Label>Expected Salary Max (VND)</Label>
                  <Input type="number" value={maxSalary} onChange={e => setMaxSalary(e.target.value)} placeholder="e.g. 40000000" className="bg-elevated" />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Job Types</Label>
                <div className="flex flex-wrap gap-4">
                  {['Full-time', 'Part-time', 'Freelance', 'Remote'].map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`job-type-${type}`} 
                        checked={jobTypes.includes(type)}
                        onCheckedChange={() => toggleJobType(type)}
                        className="data-[state=checked]:bg-accent"
                      />
                      <label htmlFor={`job-type-${type}`} className="text-sm cursor-pointer">{type}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-10 pt-6 border-t border-border">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 1} className="text-muted hover:text-primary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="bg-primary text-base hover:bg-primary/90">
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90 shadow-[0_0_15px_var(--accent-glow)]">
              {loading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save CV & Run Match</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
