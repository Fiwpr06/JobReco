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
            
        numbers = re.findall(r'\d+(?:\.\d+)?', exp_raw)
        if not numbers:
            return 0.0, 0.0
            
        val1 = float(numbers[0])
        val2 = float(numbers[1]) if len(numbers) > 1 else None
        
        if val2 is not None:
            return val1, val2
        else:
            if 'dưới' in exp_raw or 'ít hơn' in exp_raw:
                return 0.0, val1
            elif any(word in exp_raw for word in ['trên', 'hơn', 'tối thiểu']):
                return val1, val1 + 5.0  # Default upper bound
            else:
                return val1, val1
