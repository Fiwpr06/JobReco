import httpx
import logging
from typing import Dict, Any, List
from app.config import settings

logger = logging.getLogger(__name__)

class GroqService:
    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL_NAME = "llama-3.3-70b-versatile"

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        
    async def generate_explanation(
        self,
        cv_title: str,
        job_title: str,
        overall_score: float,
        matched_skills: List[str],
        missing_required: List[Dict[str, Any]],
        missing_preferred: List[Dict[str, Any]]
    ) -> str:
        if not self.api_key:
            return "Groq API Key is not configured. Please contact the administrator."
            
        # Build prompt
        prompt = f"""
        Bạn là một chuyên gia tuyển dụng (Career Advisor) chuyên nghiệp và thấu hiểu.
        Hãy viết một đoạn giải thích (khoảng 3-5 câu) để tư vấn cho ứng viên về mức độ phù hợp của họ với công việc này.
        Sử dụng giọng văn tự nhiên, thân thiện và mang tính động viên. Viết bằng tiếng Việt.
        
        Thông tin ứng viên và công việc:
        - Tiêu đề CV của ứng viên: "{cv_title}"
        - Vị trí ứng tuyển: "{job_title}"
        - Điểm phù hợp tổng quan (Overall Match Score): {overall_score * 100:.1f}%
        
        Kỹ năng đáp ứng được:
        - {', '.join(matched_skills) if matched_skills else 'Chưa có dữ liệu'}
        
        Kỹ năng bắt buộc (Required) còn thiếu:
        """
        if missing_required:
            for s in missing_required:
                prompt += f"\n        - {s['skill_name']} (Độ khó học: {s['learnability_tier']})"
        else:
            prompt += "\n        - Không thiếu kỹ năng bắt buộc nào."
            
        prompt += "\n\nYêu cầu kết quả:"
        prompt += "\n- Chỉ trả về đoạn giải thích, không kèm tiêu đề hay nội dung dư thừa."
        prompt += "\n- Trình bày rõ ràng, dễ đọc, có thể sử dụng markdown hoặc in đậm để nhấn mạnh."
        if missing_required:
            prompt += "\n- Lời khuyên nên tập trung vào các kỹ năng thiếu có độ khó học (learnability_tier) là 'easy' (nếu có)."
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.MODEL_NAME,
            "messages": [
                {"role": "system", "content": "You are a helpful and professional career advisor. You speak Vietnamese fluently."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(self.BASE_URL, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"Failed to generate explanation from Groq: {str(e)}")
            return "Hiện tại hệ thống không thể tạo giải thích chi tiết do lỗi kết nối (Groq API). Vui lòng thử lại sau."
