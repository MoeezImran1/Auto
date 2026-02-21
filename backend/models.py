from sqlalchemy import Column, Integer, String, Boolean, DateTime
from database import Base
import datetime

class EmailSettings(Base):
    __tablename__ = "email_settings"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, unique=True, index=True)
    email = Column(String)
    smtp_host = Column(String)
    smtp_port = Column(Integer)
    password_encrypted = Column(String)
    sender_name = Column(String)
    logo_url = Column(String, nullable=True)
    
    # Advanced feature: Auto Email Templates Editor
    verification_template = Column(String, default="Hello,\n\nPlease verify your email by clicking the link below:\n\n{{verification_link}}\n\nIf you did not create account ignore this email.")
    reset_template = Column(String, default="Click link to reset password:\n\n{{reset_link}}\n\nLink expires in 1 hour.")

class EmailToken(Base):
    __tablename__ = "email_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, unique=True, index=True)
    token_type = Column(String) # verify or reset
    expiry_time = Column(DateTime)
    used = Column(Boolean, default=False)

class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    type = Column(String)
    status = Column(String)
    date = Column(DateTime, default=datetime.datetime.utcnow)
