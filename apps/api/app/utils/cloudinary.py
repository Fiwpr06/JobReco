import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.config import settings

import logging

logger = logging.getLogger(__name__)

_is_initialized = False

def init_cloudinary():
    global _is_initialized
    if _is_initialized:
        return
    
    cloudinary.config(
        cloud_name = settings.CLOUDINARY_CLOUD_NAME,
        api_key = settings.CLOUDINARY_API_KEY,
        api_secret = settings.CLOUDINARY_API_SECRET,
        secure = True
    )
    _is_initialized = True

def upload_pdf_to_cloudinary(file_path: str, public_id: str = None) -> dict:
    """
    Uploads a PDF file to Cloudinary and returns the response.
    Returns dict with 'secure_url' and 'public_id'.
    """
    init_cloudinary()
    
    # Upload the file
    options = {
        "resource_type": "auto",  # [LOW-4 FIX] Use 'auto' directly (was previously set to 'raw' then overridden)
        "folder": "dacs_cv_uploads"
    }
    if public_id:
        options["public_id"] = public_id
        
    try:
        response = cloudinary.uploader.upload(file_path, **options)
        return {
            "url": response.get("secure_url"),
            "public_id": response.get("public_id"),
            "format": response.get("format")
        }
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        return None
