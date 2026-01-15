"""
Database manager with SQLAlchemy configuration
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import os

# Import Base from models
from .models import Base

class DatabaseManager:
    """SQLite manager with connection pooling and migrations"""
    
    def __init__(self, db_path: str = "data/runs.db"):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        # SQLite with WAL for concurrent reads
        self.engine = create_engine(
            f"sqlite:///{db_path}",
            poolclass=StaticPool,  # Simple pool for SQLite
            connect_args={"check_same_thread": False},
            echo=False  # Set to True for SQL debugging
        )
        
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
        
        # Initialize database
        self._initialize_db()
    
    def _initialize_db(self):
        """Create tables and run migrations"""
        Base.metadata.create_all(bind=self.engine)
        self._run_migrations()
    
    def _run_migrations(self):
        """Simple migration system"""
        with self.engine.connect() as conn:
            if not conn.dialect.has_table(conn, "migrations"):
                conn.execute(text("""
                    CREATE TABLE migrations (
                        version INTEGER PRIMARY KEY,
                        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        description TEXT
                    )
                """))
    
    def get_session(self) -> Session:
        """Get database session"""
        return self.SessionLocal()
    
    def close(self):
        """Close database connection"""
        self.engine.dispose()