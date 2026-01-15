"""
FastAPI dependencies for database sessions
"""
from core.database import DatabaseManager

def get_db():
    """Dependency for database sessions"""
    db = DatabaseManager()
    try:
        session = db.get_session()
        yield session
    finally:
        session.close()
        db.close()