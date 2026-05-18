import asyncio
import os
import sys
from sqlalchemy.future import select

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.skill import Skill

# Seed data covering IT, Finance, Accounting, Marketing, Mechanical, HR, Administrative and soft skills
SKILLS_DATA = [
    # ==================== EASY TIER (weight: 0.1) ====================
    # Languages
    {"name": "English Language", "name_vi": "Tiếng Anh", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "language", "aliases": ["tiếng anh giao tiếp", "english", "toeic", "ielts", "toefl"]},
    {"name": "Chinese Language", "name_vi": "Tiếng Trung", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "language", "aliases": ["tiếng trung giao tiếp", "chinese", "hsk", "tiếng hoa"]},
    {"name": "Japanese Language", "name_vi": "Tiếng Nhật", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "language", "aliases": ["japanese", "jlpt", "n3", "n2", "n1"]},
    {"name": "Korean Language", "name_vi": "Tiếng Hàn", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "language", "aliases": ["korean", "topik"]},

    # Office Tools
    {"name": "Excel", "name_vi": "Excel", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "tool", "aliases": ["microsoft excel", "spreadsheet", "vlookup", "excel nâng cao"]},
    {"name": "Word", "name_vi": "Word", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "tool", "aliases": ["microsoft word", "word văn phòng"]},
    {"name": "PowerPoint", "name_vi": "PowerPoint", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "tool", "aliases": ["microsoft powerpoint", "presentation", "slides"]},
    {"name": "Google Workspace", "name_vi": "Google Workspace", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "tool", "aliases": ["google sheets", "google docs", "google drive"]},

    # Soft Skills & Collaboration
    {"name": "Git", "name_vi": "Git", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "tool", "aliases": ["github", "gitlab", "bitbucket", "version control"]},
    {"name": "Jira", "name_vi": "Jira", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "tool", "aliases": ["confluence", "trello", "asana", "redmine", "clickup"]},
    {"name": "Figma", "name_vi": "Figma", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "tool", "aliases": ["sketch", "adobe xd"]},
    {"name": "Communication", "name_vi": "Giao tiếp", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "soft", "aliases": ["giao tiếp tốt", "interpersonal skills", "verbal communication"]},
    {"name": "Customer Service", "name_vi": "Chăm sóc khách hàng", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "soft", "aliases": ["cskh", "customer care", "customer support", "chăm sóc kh"]},
    {"name": "Time Management", "name_vi": "Quản lý thời gian", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "soft", "aliases": ["sắp xếp công việc", "time-management"]},
    {"name": "Teamwork", "name_vi": "Làm việc nhóm", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "soft", "aliases": ["làm việc đồng đội", "team collaboration"]},
    {"name": "Negotiation", "name_vi": "Đàm phán", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "soft", "aliases": ["thương lượng", "negotiation skills"]},
    {"name": "Sales", "name_vi": "Bán hàng", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "soft", "aliases": ["tư vấn bán hàng", "telesales", "bán hàng trực tiếp"]},
    {"name": "Content Writing", "name_vi": "Viết nội dung", "learnability_tier": "easy", "learnability_weight": 0.1, "skill_category": "soft", "aliases": ["copywriting", "viết bài", "sáng tạo nội dung"]},

    # ==================== MEDIUM TIER (weight: 0.3) ====================
    # Software Languages & Frameworks
    {"name": "Python", "name_vi": "Python", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["python programming"]},
    {"name": "FastAPI", "name_vi": "FastAPI", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["fastapi framework"]},
    {"name": "Django", "name_vi": "Django", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["django framework"]},
    {"name": "Flask", "name_vi": "Flask", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["flask framework"]},
    {"name": "JavaScript", "name_vi": "JavaScript", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["js", "es6"]},
    {"name": "TypeScript", "name_vi": "TypeScript", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["ts"]},
    {"name": "React", "name_vi": "React", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["reactjs", "react.js", "next.js", "nextjs"]},
    {"name": "Angular", "name_vi": "Angular", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["angularjs", "angular.js"]},
    {"name": "Vue", "name_vi": "Vue", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["vuejs", "vue.js"]},
    {"name": "Node.js", "name_vi": "Node.js", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["nodejs", "express", "expressjs"]},
    {"name": "Java", "name_vi": "Java", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["java programming"]},
    {"name": "Spring Boot", "name_vi": "Spring Boot", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["spring", "springboot"]},
    {"name": "C++", "name_vi": "C++", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["cpp", "c plus plus"]},
    {"name": "C#", "name_vi": "C#", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["csharp", ".net", "dotnet", "asp.net"]},
    {"name": "PHP", "name_vi": "PHP", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["laravel", "wordpress", "codeigniter"]},
    {"name": "Swift", "name_vi": "Swift", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["ios", "objective-c"]},
    {"name": "Kotlin", "name_vi": "Kotlin", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["android"]},
    {"name": "Flutter", "name_vi": "Flutter", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["dart"]},
    {"name": "React Native", "name_vi": "React Native", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["reactnative"]},
    {"name": "HTML", "name_vi": "HTML", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["html5"]},
    {"name": "CSS", "name_vi": "CSS", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["css3", "sass", "scss"]},
    {"name": "Tailwind CSS", "name_vi": "Tailwind CSS", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["tailwind", "tailwindcss"]},
    {"name": "Bootstrap", "name_vi": "Bootstrap", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "framework", "aliases": ["bootstrap4", "bootstrap5"]},
    {"name": "SQL", "name_vi": "SQL", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "language", "aliases": ["sql query", "relational db"]},

    # Databases & Caches
    {"name": "PostgreSQL", "name_vi": "PostgreSQL", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["postgres"]},
    {"name": "MySQL", "name_vi": "MySQL", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["mysql database"]},
    {"name": "MongoDB", "name_vi": "MongoDB", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["mongo", "nosql"]},
    {"name": "Redis", "name_vi": "Redis", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["redis cache"]},
    {"name": "Elasticsearch", "name_vi": "Elasticsearch", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["elastic", "elk"]},

    # DevOps & Infrastructure
    {"name": "Docker", "name_vi": "Docker", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "tool", "aliases": ["docker-compose", "containerization"]},
    {"name": "Linux", "name_vi": "Linux", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["ubuntu", "centos", "redhat", "unix", "bash shell"]},
    {"name": "CI/CD", "name_vi": "CI/CD", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["jenkins", "github actions", "gitlab ci"]},

    # Accounting, Finance & Business (Medium)
    {"name": "MISA Accounting", "name_vi": "Phần mềm MISA", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "tool", "aliases": ["misa", "kế toán misa"]},
    {"name": "Tax Law", "name_vi": "Luật thuế", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["luật thuế việt nam", "kê khai thuế", "tax legislation"]},
    {"name": "Financial Reporting", "name_vi": "Báo cáo tài chính", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["báo cáo tài chính năm", "financial statements", "bctc"]},
    {"name": "Credit Analysis", "name_vi": "Phân tích tín dụng", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["xử lý tín dụng", "credit evaluation"]},
    {"name": "Internal Audit", "name_vi": "Kiểm toán nội bộ", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["internal auditing"]},
    {"name": "Cost Accounting", "name_vi": "Kế toán chi phí", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["kế toán giá thành", "cost analysis"]},
    {"name": "Bookkeeping", "name_vi": "Ghi sổ kế toán", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["định khoản", "journal entries"]},
    {"name": "Administrative Tasks", "name_vi": "Hành chính văn phòng", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["soạn thảo văn bản", "lưu trữ hồ sơ", "office admin"]},
    {"name": "HR Recruitment", "name_vi": "Tuyển dụng nhân sự", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["tuyển dụng", "sàng lọc hồ sơ", "headhunting"]},

    # Design & Marketing (Medium)
    {"name": "Photoshop", "name_vi": "Photoshop", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "tool", "aliases": ["adobe photoshop", "pts", "photoshop cc"]},
    {"name": "Illustrator", "name_vi": "Illustrator", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "tool", "aliases": ["adobe illustrator", "ai design"]},
    {"name": "Premiere Pro", "name_vi": "Premiere Pro", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "tool", "aliases": ["adobe premiere", "video editing", "dựng phim"]},
    {"name": "SEO", "name_vi": "Tối ưu hóa tìm kiếm", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["seo google", "search engine optimization", "seo từ khóa"]},
    {"name": "Google Ads", "name_vi": "Quảng cáo Google", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "tool", "aliases": ["google adwords", "sem"]},
    {"name": "Facebook Ads", "name_vi": "Quảng cáo Facebook", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "tool", "aliases": ["fb ads", "facebook advertising"]},
    {"name": "Social Media Marketing", "name_vi": "Marketing mạng xã hội", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["quản trị fanpage", "smm", "social marketing"]},

    # Mechanical & Drawing
    {"name": "AutoCAD", "name_vi": "AutoCAD", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "tool", "aliases": ["autodesk autocad", "drafting"]},
    {"name": "SolidWorks", "name_vi": "SolidWorks", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "tool", "aliases": ["3d mechanical design", "solid works"]},
    {"name": "Technical Drawing", "name_vi": "Bản vẽ kỹ thuật", "learnability_tier": "medium", "learnability_weight": 0.3, "skill_category": "domain", "aliases": ["đọc bản vẽ", "bản vẽ cơ khí", "drafting spec"]},

    # ==================== HARD TIER (weight: 0.7) ====================
    # Computer Science & Architecture
    {"name": "System Design", "name_vi": "Thiết kế hệ thống", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["software architecture", "system architecture", "scalability", "high-level design"]},
    {"name": "Microservices", "name_vi": "Kiến trúc Microservices", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["microservice", "distributed systems", "event-driven architecture"]},
    {"name": "Data Structures and Algorithms", "name_vi": "Cấu trúc dữ liệu và giải thuật", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["dsa", "cấu trúc dữ liệu", "giải thuật", "algorithms"]},
    {"name": "Cybersecurity", "name_vi": "An ninh mạng", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["it security", "network security", "penetration testing", "infosec", "security lead", "vulnerability assessment"]},
    {"name": "Cryptography", "name_vi": "Mật mã học", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["encryption", "security protocols"]},

    # Cloud & DevOps Specialists
    {"name": "Kubernetes", "name_vi": "Kubernetes", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "tool", "aliases": ["k8s", "container orchestration", "helm"]},
    {"name": "AWS", "name_vi": "AWS", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "tool", "aliases": ["amazon web services", "cloud architecture", "ec2", "s3", "rds"]},
    {"name": "GCP", "name_vi": "GCP", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "tool", "aliases": ["google cloud platform", "google cloud"]},
    {"name": "Azure", "name_vi": "Azure", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "tool", "aliases": ["microsoft azure", "azure cloud"]},
    {"name": "Infrastructure as Code", "name_vi": "Hạ tầng dạng Code", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["terraform", "cloudformation", "ansible"]},

    # AI & Data Science
    {"name": "Machine Learning", "name_vi": "Học máy", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["ml", "nlp", "computer vision", "artificial intelligence", "ai", "deep learning"]},
    {"name": "Data Engineering", "name_vi": "Kỹ nghệ dữ liệu", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["etl pipeline", "hadoop", "spark", "data pipeline", "big data"]},
    {"name": "Deep Learning", "name_vi": "Học sâu", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["neural networks", "pytorch", "tensorflow", "keras"]},
    {"name": "Computer Vision", "name_vi": "Thị giác máy tính", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["opencv", "image processing"]},
    {"name": "Natural Language Processing", "name_vi": "Xử lý ngôn ngữ tự nhiên", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["nlp", "text mining", "llm"]},

    # Enterprise Accounting, Finance & Management (Hard)
    {"name": "SAP FICO", "name_vi": "SAP FICO", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "tool", "aliases": ["sap", "sap consultant", "sap fico module", "fico"]},
    {"name": "Tax Auditing", "name_vi": "Quyết toán thuế", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["kiểm toán thuế", "tax audit", "kế toán tổng hợp", "general accounting", "quyết toán thuế năm"]},
    {"name": "Financial Analysis", "name_vi": "Phân tích tài chính", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["financial modelling", "investment analysis", "corporate finance", "phân tích tài chính chuyên sâu"]},
    {"name": "Agile Leadership", "name_vi": "Quản trị dự án Agile", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["scrum master", "product owner", "project manager", "scrum", "agile scrum"]},
    {"name": "Strategic Planning", "name_vi": "Hoạch định chiến lược", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["business strategy", "corporate planning", "hoạch định"]},
    {"name": "Corporate Law", "name_vi": "Luật doanh nghiệp", "learnability_tier": "hard", "learnability_weight": 0.7, "skill_category": "domain", "aliases": ["pháp chế doanh nghiệp", "luật doanh nghiệp việt nam"]}
]

async def seed_skills():
    print("Connecting to DB and seeding skills...")
    async with AsyncSessionLocal() as session:
        skills_seeded = 0
        skills_updated = 0
        
        for skill_data in SKILLS_DATA:
            name = skill_data["name"]
            
            # Check if skill already exists
            existing_skill = await session.execute(select(Skill).filter(Skill.name == name))
            skill_obj = existing_skill.scalars().first()
            
            if not skill_obj:
                skill_obj = Skill(name=name)
                session.add(skill_obj)
                skills_seeded += 1
            else:
                skills_updated += 1
                
            skill_obj.name_vi = skill_data["name_vi"]
            skill_obj.learnability_tier = skill_data["learnability_tier"]
            skill_obj.learnability_weight = skill_data["learnability_weight"]
            skill_obj.skill_category = skill_data["skill_category"]
            skill_obj.aliases = skill_data["aliases"]
            
        await session.commit()
        print(f"Skills seeding completed: Seeded {skills_seeded} new skills, updated {skills_updated} existing skills.")

if __name__ == "__main__":
    asyncio.run(seed_skills())
