export interface MatchResult {
  rank: number;
  job_id: string;
  apply_url: string;
  title_en?: string;
  title_vi?: string;
  company_name_en?: string;
  company_name_vi?: string;
  job_address?: string;
  salary_display?: string;
  job_type?: string;
  scores: {
    overall: number;
    skill_match: number;
    experience_match: number;
    salary_match: number;
    location_match: number;
    hgat_cosine: number;
    slwg_total_penalty: number;
  };
  skill_analysis: {
    matched_skills: string[];
    missing_required: Array<{ skill: string; tier: string; suggestion: string }>;
    missing_preferred: Array<{ skill: string; tier: string; suggestion: string }>;
  };
  explanation?: string;
}
