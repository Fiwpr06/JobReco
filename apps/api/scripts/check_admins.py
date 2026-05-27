import asyncio
import sys
import os

sys.path.insert(0, 'd:/Workspace/DACS/DACS3/JOB_RECOMMENDATION/apps/api')
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id, email, role, company_id FROM users WHERE role = 'admin' OR email LIKE '%admin%'"))
        for row in result.fetchall():
            print(f"ID: {row[0]}, Email: {row[1]}, Role: {row[2]}, CompanyID: {row[3]}")

if __name__ == '__main__':
    asyncio.run(main())
