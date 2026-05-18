import asyncio
import os
import sys
import re
import pandas as pd
from datetime import datetime
from sqlalchemy.future import select

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal, engine
from app.models.job import Job, Company
from app.config import settings

def parse_salary(salary_raw: str):
    if not salary_raw or not isinstance(salary_raw, str):
        return None, None, None, None, True, 'VND'
    
    salary_raw = salary_raw.strip()
    lower_s = salary_raw.lower()
    
    if any(word in lower_s for word in ['thỏa thuận', 'thoả thuận', 'thương lượng', 'cạnh tranh', 'negotiable', 'liên hệ']):
        return None, None, None, None, True, 'VND'
    
    is_usd = 'usd' in lower_s or '$' in lower_s
    currency = 'USD' if is_usd else 'VND'
    
    # Extract all numbers/decimals
    # Standardize commas and dots
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
        if any(word in lower_s for word in ['lên đến', 'dưới', 'tối đa', 'upto', 'up to']):
            max_val = val1 * multiplier
        elif any(word in lower_s for word in ['từ', 'trên', 'tối thiểu', 'hơn']):
            min_val = val1 * multiplier
        else:
            min_val = val1 * multiplier
            max_val = val1 * multiplier
            
    is_negotiable = False
    
    if currency == 'USD':
        # Decimal type for usd
        return None, None, min_val, max_val, is_negotiable, currency
    else:
        # BigInt type for vnd
        return int(min_val) if min_val else None, int(max_val) if max_val else None, None, None, is_negotiable, currency


def parse_experience(exp_raw: str):
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


def parse_quantity(qty_raw):
    if pd.isna(qty_raw):
        return 1
    if isinstance(qty_raw, (int, float)):
        return int(qty_raw)
    qty_str = str(qty_raw).strip()
    numbers = re.findall(r'\d+', qty_str)
    if numbers:
        return int(numbers[0])
    return 1


async def seed_jobs():
    excel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/db_job_tuan.xlsx'))
    print(f"Reading data from: {excel_path}")
    
    if not os.path.exists(excel_path):
        print(f"Error: Excel file not found at {excel_path}")
        return
        
    df = pd.read_excel(excel_path)
    print(f"Successfully loaded {len(df)} rows.")
    
    async with AsyncSessionLocal() as session:
        # Cache for companies to avoid duplicated inserts
        company_cache = {}
        
        # Load existing companies
        existing_companies = await session.execute(select(Company))
        for comp in existing_companies.scalars().all():
            company_cache[comp.name_vi] = comp.id
            
        jobs_seeded = 0
        
        for idx, row in df.iterrows():
            job_id_raw = str(row.get('JobID', '')).strip()
            if not job_id_raw or pd.isna(row.get('JobID')):
                continue
                
            apply_url_raw = str(row.get('URL_Job', '')).strip()
            
            # Company normalization
            company_name = str(row.get('Name company', '')).strip()
            company_id = None
            if company_name and not pd.isna(row.get('Name company')):
                if company_name in company_cache:
                    company_id = company_cache[company_name]
                else:
                    new_comp = Company(
                        name_vi=company_name,
                        company_size=str(row.get('company_size', '')).strip()
                    )
                    session.add(new_comp)
                    await session.flush()  # Populates new_comp.id
                    company_cache[company_name] = new_comp.id
                    company_id = new_comp.id

            # Parse salaries and experiences
            sal_raw = str(row.get('Salary', ''))
            sal_min_vnd, sal_max_vnd, sal_min_usd, sal_max_usd, is_neg, currency = parse_salary(sal_raw)
            
            exp_raw = str(row.get('Experience', ''))
            exp_min, exp_max = parse_experience(exp_raw)
            
            qty = parse_quantity(row.get('quantity'))
            
            # Check if job already exists
            existing_job = await session.execute(select(Job).filter(Job.job_id == job_id_raw))
            job_obj = existing_job.scalars().first()
            
            if not job_obj:
                job_obj = Job(job_id=job_id_raw)
                session.add(job_obj)
            
            job_obj.apply_url = apply_url_raw
            job_obj.title_vi = str(row.get('Title', '')).strip()
            # Placeholder english title (can be translated in Phase 1)
            job_obj.title_en = job_obj.title_vi 
            
            job_obj.company_name_vi = company_name
            job_obj.company_name_en = company_name
            
            job_obj.job_address = str(row.get('Job Address', '')).strip()
            job_obj.job_address_detail = str(row.get('Job Address detail', '')).strip()
            
            job_obj.job_requirements_vi = str(row.get('Job Requirements', '')).strip()
            job_obj.job_description_vi = str(row.get('Job description', '')).strip()
            job_obj.benefit_vi = str(row.get('benefit', '')).strip()
            
            job_obj.salary_raw = sal_raw
            job_obj.salary_min_vnd = sal_min_vnd
            job_obj.salary_max_vnd = sal_max_vnd
            job_obj.salary_min_usd = sal_min_usd
            job_obj.salary_max_usd = sal_max_usd
            job_obj.salary_is_negotiable = is_neg
            job_obj.salary_currency = currency
            
            job_obj.experience_raw = exp_raw
            job_obj.experience_min_years = exp_min
            job_obj.experience_max_years = exp_max
            
            job_obj.job_type = str(row.get('Job type', '')).strip()
            job_obj.company_size = str(row.get('company_size', '')).strip()
            job_obj.quantity = qty
            job_obj.company_id = company_id
            job_obj.normalized_at = datetime.utcnow()
            
            jobs_seeded += 1
            if jobs_seeded % 50 == 0:
                print(f"Prepared {jobs_seeded} jobs...")
                
        await session.commit()
        print(f"Successfully committed {jobs_seeded} jobs to the database.")

if __name__ == "__main__":
    asyncio.run(seed_jobs())
