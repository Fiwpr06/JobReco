import httpx
from loguru import logger

class TranslationService:
    """
    Translates Vietnamese text into English using the free Google Translate API.
    Handles long text by joining sentences/blocks.
    """
    # [MED-3 FIX] Class-level singleton client to prevent connection leaks.
    # Previously, every instantiation created a new httpx.Client without closing it.
    _client = None
    
    def __init__(self):
        self.url = "https://translate.googleapis.com/translate_a/single"
        if TranslationService._client is None:
            TranslationService._client = httpx.Client(timeout=15.0)
        self.client = TranslationService._client

    def translate_vi_to_en(self, text: str) -> str:
        if not text or not isinstance(text, str):
            return ""
            
        text = text.strip()
        if not text:
            return ""
        
        try:
            params = {
                "client": "gtx",
                "sl": "vi",
                "tl": "en",
                "dt": "t",
                "q": text
            }
            # Send GET request to Google API
            response = self.client.get(self.url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Parse response structure
            translated_segments = []
            if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                for segment in data[0]:
                    if isinstance(segment, list) and len(segment) > 0 and segment[0]:
                        translated_segments.append(segment[0])
            
            if not translated_segments:
                return text
                
            return "".join(translated_segments)
        except Exception as e:
            logger.warning(f"Translation failed: {e}. Falling back to original text.")
            return text
