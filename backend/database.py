import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Use DATABASE_URL from environment if available (for Vercel/Production with Postgres/MySQL)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    connect_args = {}
    if "sqlite" in DATABASE_URL:
        connect_args = {"check_same_thread": False}
        
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
else:
    # 2. Local fallback to SQLite using an ABSOLUTE path
    # This prevents the database from resetting if the server is started from a different directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = "/tmp/email_auth.db" if os.getenv("VERCEL") else os.path.join(BASE_DIR, "email_auth.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
