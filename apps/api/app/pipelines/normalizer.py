import re
from typing import Tuple, Optional

class SalaryNormalizer:
    """
    Normalizes salary from raw text into structured fields:
    - salary_min_vnd, salary_max_vnd (for VND currency)
    - salary_min_usd, salary_max_usd (for USD currency)
    - salary_is_negotiable
    - salary_currency
    """
    
    @staticmethod
    def normalize(salary_raw: str) -> Tuple[Optional[int], Optional[int], Optional[float], Optional[float], bool, str]:
        if not salary_raw or not isinstance(salary_raw, str):
            return None, None, None, None, True, 'VND'
        
        salary_raw = salary_raw.strip()
        
        # If it's a full CV text, don't try to parse salary with naive regex
        if len(salary_raw) > 300:
            return None, None, None, None, True, 'VND'

        lower_s = salary_raw.lower()
        
        # Check if negotiable
        if any(word in lower_s for word in ['thỏa thuận', 'thoả thuận', 'thương lượng', 'cạnh tranh', 'negotiable', 'liên hệ']):
            return None, None, None, None, True, 'VND'
            
        is_usd = 'usd' in lower_s or '$' in lower_s
        currency = 'USD' if is_usd else 'VND'
        
        # Extract all numbers/decimals
        clean_raw = salary_raw.replace(',', '')
        numbers = re.findall(r'\d+(?:\.\d+)?', clean_raw)
        if not numbers:
            return None, None, None, None, True, currency
            
        val1 = float(numbers[0])
        val2 = float(numbers[1]) if len(numbers) > 1 else None
        
        multiplier = 1
        if 'triệu' in lower_s or 'tr' in lower_s:
            multiplier = 1_000_000
        elif 'tỷ' in lower_s:
            multiplier = 1_000_000_000
            
        min_val, max_val = None, None
        if val2 is not None:
            min_val = val1 * multiplier
            max_val = val2 * multiplier
        else:
            if any(word in lower_s for word in ['lên đến', 'dưới', 'tối đa', 'upto', 'up to', 'tới']):
                max_val = val1 * multiplier
            elif any(word in lower_s for word in ['từ', 'trên', 'tối thiểu', 'hơn']):
                min_val = val1 * multiplier
            else:
                min_val = val1 * multiplier
                max_val = val1 * multiplier
                
        is_negotiable = False
        
        if currency == 'USD':
            return None, None, min_val, max_val, is_negotiable, currency
        else:
            return int(min_val) if min_val else None, int(max_val) if max_val else None, None, None, is_negotiable, currency


class ExperienceNormalizer:
    """
    Normalizes experience from raw text into min and max years.
    """
    
    @staticmethod
    def normalize(exp_raw: str) -> Tuple[float, float]:
        if not exp_raw or not isinstance(exp_raw, str):
            return 0.0, 0.0
            
        exp_raw = exp_raw.strip().lower()
        if any(word in exp_raw for word in ['không yêu cầu', 'no experience', 'chưa có kinh nghiệm']):
            return 0.0, 0.0
            
        # If it's a full CV text, don't try to parse experience with naive regex
        if len(exp_raw) > 300:
            return ExperienceNormalizer._infer_from_position(exp_raw)
            
        numbers = re.findall(r'\d+(?:\.\d+)?', exp_raw)
        if not numbers:
            return ExperienceNormalizer._infer_from_position(exp_raw)
            
        val1 = float(numbers[0])
        val2 = float(numbers[1]) if len(numbers) > 1 else None
        
        # Additional safety cap
        if val1 > 50:
            return ExperienceNormalizer._infer_from_position(exp_raw)
            
        if val2 is not None:
            if val2 > 50: val2 = val1
            return val1, val2
        else:
            if 'dưới' in exp_raw or 'ít hơn' in exp_raw:
                return 0.0, val1
            elif any(word in exp_raw for word in ['trên', 'hơn', 'tối thiểu']):
                return val1, val1 + 5.0  # Default upper bound
            else:
                return val1, val1

    @staticmethod
    def _infer_from_position(text: str) -> Tuple[float, float]:
        """Infer experience based on position levels if mentioned."""
        # Check higher levels first
        if re.search(r'\b(director|giám đốc|ceo|cto|cfo|coo|head of|vp|vice president)\b', text, re.IGNORECASE):
            return 10.0, 10.0
        
        if re.search(r'\b(principal|lead|manager|trưởng phòng|quản lý|trưởng nhóm|tech lead|architect)\b', text, re.IGNORECASE):
            return 7.0, 7.0
            
        if re.search(r'\b(senior|snr|chuyên viên cao cấp|sr)\b', text, re.IGNORECASE):
            return 4.0, 4.0
            
        if re.search(r'\b(mid-level|middle|mid|chuyên viên)\b', text, re.IGNORECASE):
            return 2.0, 2.0
            
        if re.search(r'\b(junior|jnr|jr|mới đi làm)\b', text, re.IGNORECASE):
            return 1.0, 1.0
            
        if re.search(r'\b(fresher|intern|internship|thực tập sinh|thực tập|mới tốt nghiệp|mới ra trường)\b', text, re.IGNORECASE):
            return 0.0, 0.0
            
        return 0.0, 0.0

class JobTitleExtractor:
    """
    Extracts the most likely job title from raw CV text.
    """
    
    # Common job title keywords (English and Vietnamese)
    TITLE_KEYWORDS = [
        "developer", "engineer", "designer", "manager", "analyst", "intern", "specialist", 
        "director", "architect", "consultant", "executive", "lead", "head", "founder", 
        "assistant", "administrator", "officer", "coordinator", "tester", "qa", "qc",
        "lập trình viên", "kỹ sư", "quản lý", "giám đốc", "chuyên viên", "thực tập sinh", 
        "nhân viên", "kế toán", "trợ lý", "trưởng phòng", "trưởng nhóm", "nhà phát triển",
        "data scientist", "data engineer", "product owner", "scrum master", "business analyst",
        "fresher", "junior", "senior", "dev", "devops", "marketing", "sales", "hr"
    ]

    JUNK_PHRASES = [
        "resume", "curriculum vitae", "cv", "profile", "uploaded resume profile", "resume profile",
        "thông tin", "cá nhân", "personal", "contact", "education", "học vấn",
        "kinh nghiệm", "experience", "skills", "kỹ năng", "summary", "mục tiêu",
        "objective", "about me", "giới thiệu", "portfolio", "project", "dự án", "certifications", "chứng chỉ"
    ]

    @staticmethod
    def _is_junk(line: str) -> bool:
        lower_l = line.lower().strip()
        # Exact match or starts with common headers
        if lower_l in JobTitleExtractor.JUNK_PHRASES:
            return True
        for junk in JobTitleExtractor.JUNK_PHRASES:
            if lower_l == junk or lower_l.startswith(junk + ":") or lower_l == f"uploaded {junk}":
                return True
        if "uploaded resume profile" in lower_l or "resume profile" in lower_l:
            return True
        return False

    @staticmethod
    def extract(raw_text: str) -> Optional[str]:
        if not raw_text or not isinstance(raw_text, str):
            return None
            
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        
        # Look at the first 20 lines to find a matching job title
        search_lines = lines[:20]
        
        # 1. Try to find a line with a known title keyword (must be relatively short)
        for line in search_lines:
            if 5 < len(line) < 80 and not JobTitleExtractor._is_junk(line):
                lower_line = line.lower()
                for kw in JobTitleExtractor.TITLE_KEYWORDS:
                    # Match whole words for short keywords like "qa", "qc", "hr", "dev"
                    if len(kw) <= 3:
                        if re.search(rf'\b{kw}\b', lower_line):
                            return line[:100]
                    elif kw in lower_line:
                        # Exclude if it looks like a degree
                        if any(deg in lower_line for deg in ["bachelor", "master", "degree", "cử nhân", "đại học"]):
                            continue
                        return line[:100]
                        
        # 2. Fallback: Find the first line that looks like a title (short, capitalized or reasonable length)
        # We will try to skip the person's name (which is usually the very first line if it's 2-4 words)
        candidate_lines = []
        for line in search_lines:
            if 5 < len(line) < 60 and not JobTitleExtractor._is_junk(line):
                # Exclude obvious contact info (email, phone, links)
                if '@' not in line and not re.search(r'\d{8,}', line) and 'http' not in line and 'github.com' not in line and 'linkedin.com' not in line:
                    candidate_lines.append(line)

        if len(candidate_lines) > 1:
            # If the first line is likely a name (all caps, 2-5 words), return the second line
            words = candidate_lines[0].split()
            if candidate_lines[0].isupper() and 2 <= len(words) <= 5:
                return candidate_lines[1][:100]
            # Or just return the first one
            return candidate_lines[0][:100]
        elif len(candidate_lines) == 1:
            return candidate_lines[0][:100]
            
        # 3. Last resort
        if lines:
            for line in lines[:5]:
                if not JobTitleExtractor._is_junk(line):
                    return line[:100]
            
        return "Resume Profile"


