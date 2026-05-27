import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.auth_service import AuthService
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def create_admin():
    async with AsyncSessionLocal() as session:
        # Check if admin already exists
        check_stmt = text("SELECT id FROM users WHERE email = 'admin@graphhire.com'")
        result = await session.execute(check_stmt)
        if result.scalar_one_or_none():
            update_stmt = text("UPDATE users SET is_verified = true, is_active = true WHERE email = 'admin@graphhire.com'")
            await session.execute(update_stmt)
            await session.commit()
            print("Admin user updated to be verified.")
            print("Email: admin@graphhire.com")
            print("Password: admin123")
            return
        
        hashed_password = AuthService.get_password_hash('admin123')
        insert_stmt = text("""
            INSERT INTO users (email, hashed_password, full_name, role, is_active, is_verified, created_at)
            VALUES ('admin@graphhire.com', :hashed_password, 'System Administrator', 'admin', true, true, NOW())
        """)
        
        await session.execute(insert_stmt, {"hashed_password": hashed_password})
        await session.commit()
        
        print("Admin user created successfully!")
        print("Email: admin@graphhire.com")
        print("Password: admin123")

if __name__ == '__main__':
    asyncio.run(create_admin())
