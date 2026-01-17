"""
SQLAlchemy models only - no database manager here
"""
from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, 
    Boolean, JSON, Float, ForeignKey, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class RunRecord(Base):
    """Complete run history with performance metrics"""
    __tablename__ = "runs"
    
    id = Column(String(64), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    trigger_type = Column(String(32))
    trigger_source = Column(String(128))
    environment = Column(String(32))
    agents_executed = Column(JSON)
    execution_order = Column(JSON)
    total_agents = Column(Integer)
    success = Column(Boolean, default=False)
    results = Column(JSON)
    summary = Column(Text)
    duration_seconds = Column(Float)
    tokens_used = Column(Integer)
    estimated_cost = Column(Float)
    peak_memory_mb = Column(Float)
    error = Column(Text)
    error_traceback = Column(Text)
    retry_count = Column(Integer, default=0)
    tags = Column(JSON)
    notes = Column(Text)
    
    __table_args__ = (
        Index('idx_runs_created_at', 'created_at'),
        Index('idx_runs_success', 'success'),
        Index('idx_runs_trigger_type', 'trigger_type'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "trigger_type": self.trigger_type,
            "trigger_source": self.trigger_source,
            "environment": self.environment,
            "agents_executed": self.agents_executed or [],
            "execution_order": self.execution_order or [],
            "total_agents": self.total_agents,
            "success": self.success,
            "results": self.results or {},
            "summary": self.summary,
            "duration_seconds": self.duration_seconds,
            "tokens_used": self.tokens_used,
            "estimated_cost": self.estimated_cost,
            "peak_memory_mb": self.peak_memory_mb,
            "error": self.error,
            "error_traceback": self.error_traceback,
            "retry_count": self.retry_count,
            "tags": self.tags or {},
            "notes": self.notes,
        }

class AgentResult(Base):
    """Granular agent execution records"""
    __tablename__ = "agent_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey('runs.id'), index=True)
    agent_name = Column(String(64))
    agent_version = Column(String(32))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Float)
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    total_tokens = Column(Integer)
    success = Column(Boolean)
    output = Column(JSON)
    error = Column(Text)
    run = relationship("RunRecord", backref="agent_results")
    
    __table_args__ = (
        Index('idx_agent_results_run_agent', 'run_id', 'agent_name'),
    )

class Schedule(Base):
    """Scheduled execution configuration"""
    __tablename__ = "schedules"
    
    id = Column(String(64), primary_key=True)
    name = Column(String(128), unique=True)
    description = Column(Text)
    cron_expression = Column(String(64))
    timezone = Column(String(64), default="UTC")
    enabled = Column(Boolean, default=True)
    environment = Column(String(32), default="production")
    agent_config = Column(JSON)
    tags = Column(JSON)
    last_run_at = Column(DateTime(timezone=True))
    last_run_id = Column(String(64))
    next_run_at = Column(DateTime(timezone=True))
    total_runs = Column(Integer, default=0)
    successful_runs = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index('idx_schedules_enabled_next', 'enabled', 'next_run_at'),
    )