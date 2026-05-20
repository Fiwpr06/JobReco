export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'candidate' | 'recruiter' | 'admin';
  is_active: boolean;
}

export interface CV {
  id: number;
  title_en: string;
  summary_en?: string;
  experience_years: number;
  current_salary_vnd?: number;
  expected_salary_min_vnd?: number;
  expected_salary_max_vnd?: number;
  preferred_locations: string[];
  preferred_job_types: string[];
  is_primary: boolean;
  skills: CVSkill[];
}

export interface CVSkill {
  skill_id: number;
  skill_name: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
}

export interface Job {
  id: number;
  job_id: string;
  apply_url: string; // REQUIRED — for Apply button
  title_vi?: string;
  title_en?: string;
  company_name_vi?: string;
  company_name_en?: string;
  job_address?: string;
  salary_raw?: string;
  salary_min_vnd?: number;
  salary_max_vnd?: number;
  salary_is_negotiable: boolean;
  experience_min_years?: number;
  experience_max_years?: number;
  job_description_vi?: string;
  job_description_en?: string;
  job_type?: string;
  quantity?: number;
  is_active: boolean;
  job_requirements_vi?: string;
  job_requirements_en?: string;
  benefit_vi?: string;
  benefit_en?: string;
}

export interface SkillGap {
  skill: string;
  tier: 'easy' | 'medium' | 'hard';
  omega: number; // SLWG weight: 0.1 | 0.3 | 0.7
  slwg_penalty: number;
  suggestion: string;
  is_required?: boolean;
}

export interface MatchScores {
  overall: number; // 0.0 - 1.0
  hgat_cosine: number; // cosine similarity from HGAT
  skill_match: number;
  experience_match: number;
  salary_match: number;
  location_match: number;
  slwg_total_penalty: number;
}

export interface SkillAnalysis {
  matched_skills: string[];
  missing_required: SkillGap[];
  missing_preferred: SkillGap[];
}

export interface MatchResult {
  rank: number;
  job_id: string;
  apply_url: string; // REQUIRED — window.open(apply_url)
  title_en?: string;
  title_vi?: string;
  company_name_en?: string; // Khớp lệnh từ user feedback
  company_name_vi?: string; // Khớp lệnh từ user feedback
  job_address?: string;
  salary_display?: string;
  salary_min_vnd?: number;
  salary_max_vnd?: number;
  job_type?: string;
  scores: MatchScores;
  skill_analysis: SkillAnalysis;
  explanation?: string;
}

export interface MatchingResponse {
  cv_id: number;
  model_version: string;
  computed_at: string;
  total_candidates_evaluated: number;
  total_returned: number;
  results: MatchResult[];
}

export interface TrendingSkill {
  skill_name: string;
  demand_score: number;
  learnability_tier: 'easy' | 'medium' | 'hard';
  growth_rate?: number;
}
