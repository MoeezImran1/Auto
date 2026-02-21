import sys
import os

# Ensure Vercel can find modules in the same backend folder
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import engine, Base, get_db
import models
import schemas
import security
import email_service

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Email Auth Service")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional: Serve static files for frontend
# app.mount("/static", StaticFiles(directory="../frontend"), name="static")

def log_email_action(db: Session, email: str, action_type: str, status: str):
    """Utility to log an email sending."""
    log_entry = models.EmailLog(email=email, type=action_type, status=status)
    db.add(log_entry)
    db.commit()

@app.post("/connect-email", response_model=schemas.EmailSettingsResponse)
def connect_email(settings: schemas.EmailSettingsCreate, db: Session = Depends(get_db)):
    # Verify SMTP Connection Before Saving
    is_valid = email_service.test_smtp_connection(
        host=settings.smtp_host,
        port=settings.smtp_port,
        email=settings.email,
        password=settings.password
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="SMTP Connection Failed. Check credentials.")

    # Save credentials securely
    db_setting = db.query(models.EmailSettings).filter(models.EmailSettings.domain == settings.domain).first()
    encrypted_pwd = security.encrypt_password(settings.password)

    if db_setting:
        db_setting.email = settings.email
        db_setting.smtp_host = settings.smtp_host
        db_setting.smtp_port = settings.smtp_port
        db_setting.password_encrypted = encrypted_pwd
        db_setting.sender_name = settings.sender_name
        db_setting.logo_url = settings.logo_url
    else:
        db_setting = models.EmailSettings(
            domain=settings.domain,
            email=settings.email,
            smtp_host=settings.smtp_host,
            smtp_port=settings.smtp_port,
            password_encrypted=encrypted_pwd,
            sender_name=settings.sender_name,
            logo_url=settings.logo_url
        )
        db.add(db_setting)

    db.commit()
    db.refresh(db_setting)
    return db_setting

@app.get("/email-settings", response_model=list[schemas.EmailSettingsResponse])
def get_email_settings(db: Session = Depends(get_db)):
    return db.query(models.EmailSettings).all()

@app.put("/email-settings/{domain}")
def update_email_templates(domain: str, templates: schemas.EmailSettingsUpdate, db: Session = Depends(get_db)):
    setting = db.query(models.EmailSettings).filter(models.EmailSettings.domain == domain).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Domain not found")
    if templates.verification_template:
        setting.verification_template = templates.verification_template
    if templates.reset_template:
        setting.reset_template = templates.reset_template
    db.commit()
    return {"message": "Templates updated successfully"}

@app.post("/test-email")
def test_email(req: schemas.TestEmailRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    setting = db.query(models.EmailSettings).filter(models.EmailSettings.domain == req.domain).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Email settings for this domain not found.")

    pwd = security.decrypt_password(setting.password_encrypted)
    success = email_service.send_email(
        host=setting.smtp_host,
        port=setting.smtp_port,
        username=setting.email,
        password=pwd,
        sender_name=setting.sender_name,
        to_email=req.to_email,
        subject="Test SMTP Connection",
        html_body="<h3>Your SMTP connection works properly!</h3>"
    )

    log_email_action(db, req.to_email, "Test Email", "Success" if success else "Failed")

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send test email.")
    return {"message": "Test email sent successfully"}


@app.post("/send-verification")
def send_verification(req: schemas.SendVerificationRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    setting = db.query(models.EmailSettings).filter(models.EmailSettings.domain == req.domain).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Domain not connected.")

    # Generate token
    raw_token = security.generate_secure_token()
    hashed_token = security.hash_token(raw_token)
    expiry = datetime.utcnow() + timedelta(hours=1)

    db_token = models.EmailToken(
        email=req.email,
        token=hashed_token,
        token_type="verify",
        expiry_time=expiry
    )
    db.add(db_token)
    db.commit()

    # Link logic
    base_url = "https://" + setting.domain
    # Fallback to local if not production testing
    link = f"{base_url}/verify-email?token={raw_token}&email={req.email}"
    logo = setting.logo_url if setting.logo_url else ""

    body = email_service.render_template(setting.verification_template, verification_link=link, logo=logo)
    
    pwd = security.decrypt_password(setting.password_encrypted)
    
    success = email_service.send_email(
        host=setting.smtp_host,
        port=setting.smtp_port,
        username=setting.email,
        password=pwd,
        sender_name=setting.sender_name,
        to_email=req.email,
        subject="Verify Your Email",
        html_body=body.replace('\n', '<br>')
    )
    log_email_action(db, req.email, "Verification", "Success" if success else "Failed")

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send verification email.")

    return {"message": "Verification email sent successfully"}


@app.post("/send-reset")
def send_reset(req: schemas.SendResetRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    setting = db.query(models.EmailSettings).filter(models.EmailSettings.domain == req.domain).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Domain not connected.")

    # Generate token
    raw_token = security.generate_secure_token()
    hashed_token = security.hash_token(raw_token)
    expiry = datetime.utcnow() + timedelta(hours=1)

    db_token = models.EmailToken(
        email=req.email,
        token=hashed_token,
        token_type="reset",
        expiry_time=expiry
    )
    db.add(db_token)
    db.commit()

    # Link logic
    base_url = "https://" + setting.domain
    link = f"{base_url}/reset-password?token={raw_token}&email={req.email}"
    logo = setting.logo_url if setting.logo_url else ""

    body = email_service.render_template(setting.reset_template, reset_link=link, logo=logo)
    pwd = security.decrypt_password(setting.password_encrypted)
    
    success = email_service.send_email(
        host=setting.smtp_host,
        port=setting.smtp_port,
        username=setting.email,
        password=pwd,
        sender_name=setting.sender_name,
        to_email=req.email,
        subject="Reset Your Password",
        html_body=body.replace('\n', '<br>')
    )
    log_email_action(db, req.email, "Reset Password", "Success" if success else "Failed")

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send reset email.")

    return {"message": "Reset email sent successfully"}

@app.get("/verify-token")
def verify_token(email: str, token: str, type: str, db: Session = Depends(get_db)):
    hashed_token = security.hash_token(token)
    db_token = db.query(models.EmailToken).filter(
        models.EmailToken.email == email,
        models.EmailToken.token == hashed_token,
        models.EmailToken.token_type == type,
        models.EmailToken.used == False
    ).first()

    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid token")

    if datetime.utcnow() > db_token.expiry_time:
        raise HTTPException(status_code=400, detail="Token Expired")

    # Mark as used
    db_token.used = True
    db.commit()

    return {"message": "Token verified successfully"}

@app.post("/cleanup-tokens")
def cleanup_tokens(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Extra Feature: Delete expired tokens."""
    def delete_expired():
        db_session = next(get_db())
        db_session.query(models.EmailToken).filter(models.EmailToken.expiry_time < datetime.utcnow()).delete()
        db_session.commit()
    background_tasks.add_task(delete_expired)
    return {"message": "Cleanup job queued"}
