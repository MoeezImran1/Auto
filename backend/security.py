import secrets
import hashlib
from cryptography.fernet import Fernet
import os

# In a real production environment, this key should be loaded from an environment variable.
# Example: ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
# For this demo, we generate a static key or use a predefined one if not set.
# Using a fixed key just for testing/standalone script purposes, but best is from env.
_STATIC_KEY = b'rBqWqM6T5lR0YqV8H1E6XfXmP5K8H0sM1SjXJ1H7JFs='
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", _STATIC_KEY)

cipher_suite = Fernet(ENCRYPTION_KEY)

def encrypt_password(password: str) -> str:
    """Encrypts an SMTP password."""
    return cipher_suite.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    """Decrypts an SMTP password."""
    return cipher_suite.decrypt(encrypted_password.encode()).decode()

def generate_secure_token() -> str:
    """Generate a random 32-character secure URL-safe token."""
    return secrets.token_urlsafe(32)

def generate_otp() -> str:
    """Generate a random 6-digit OTP code."""
    return str(secrets.randbelow(900000) + 100000)

def hash_token(token: str) -> str:
    """Hashes the token for secure storage."""
    return hashlib.sha256(token.encode()).hexdigest()
