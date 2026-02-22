from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class EmailSettingsCreate(BaseModel):
    domain: str
    email: EmailStr
    smtp_host: str
    smtp_port: int
    password: str
    sender_name: str
    logo_url: Optional[str] = None

class EmailSettingsUpdate(BaseModel):
    verification_template: Optional[str] = None
    reset_template: Optional[str] = None

class EmailSettingsResponse(BaseModel):
    id: int
    domain: str
    email: str
    smtp_host: str
    smtp_port: int
    sender_name: str
    logo_url: Optional[str]
    verification_template: str
    reset_template: str

    class Config:
        from_attributes = True

class TestEmailRequest(BaseModel):
    domain: str
    to_email: EmailStr

class SendVerificationRequest(BaseModel):
    domain: str
    email: EmailStr
    user_id: str

class SendResetRequest(BaseModel):
    domain: str
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
    type: str = "verify"

class EmailLogResponse(BaseModel):
    id: int
    email: str
    type: str
    status: str
    date: datetime

    class Config:
        from_attributes = True
