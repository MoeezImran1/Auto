# Email Auth Service

A full-stack Email Sender and Authentication Email Service replacement for Supabase email functionality.

## Features
- Connect multiple custom domain emails (Gmail, Zoho, Hostinger, Outlook, etc.)
- Auto Email Templates Editor (Verification & Password Reset)
- Auto Token Generation (Secure, hashed before DB insertion)
- SMTP Credential Encryption
- RESTful API for seamless integration

## 1. Installation Guide

### Prerequisites
- Python 3.9+
- SQLite (included in Python)

### Setup Instructions

1. **Clone/Navigate to directory**
    ```sh
    cd email-auth-service
    ```

2. **Create a Virtual Environment**
    ```sh
    python -m venv venv
    ```

3. **Activate the Virtual Environment**
    - Windows: `venv\Scripts\activate`
    - Mac/Linux: `source venv/bin/activate`

4. **Install Dependencies**
    ```sh
    pip install -r requirements.txt
    ```

5. **Run the Backend Server**
    ```sh
    cd backend
    uvicorn main:app --reload --port 8000
    ```

6. **Serve the Frontend**
    Wait, the frontend is simple HTML/CSS/JS. You can open `frontend/index.html` directly in your browser, or serve it using Python's http server:
    ```sh
    cd frontend
    python -m http.server 3000
    ```
    Then visit `http://localhost:3000`.

---

## 2. API Documentation

### Base URL: `http://localhost:8000`

### 2.1 Connect Email
Saves SMTP credentials. System verifies SMTP connection before saving.
- **Endpoint**: `POST /connect-email`
- **Body**:
  ```json
  {
      "domain": "mywebsite.com",
      "email": "noreply@mywebsite.com",
      "smtp_host": "smtp.gmail.com",
      "smtp_port": 587,
      "password": "AppPassword123",
      "sender_name": "MyWebsite Support"
  }
  ```
- **Response**: Details of saved settings

### 2.2 Test SMTP
Sends a test email to ensure configuration works.
- **Endpoint**: `POST /test-email`
- **Body**:
  ```json
  {
      "domain": "mywebsite.com",
      "to_email": "user@example.com"
  }
  ```

### 2.3 Send Verification Email
Generates secure token, injects into template, and sends to the user.
- **Endpoint**: `POST /send-verification`
- **Body**:
  ```json
  {
      "domain": "mywebsite.com",
      "email": "newuser@example.com",
      "user_id": "user_123"
  }
  ```

### 2.4 Send Password Reset
Generates secure token, injects into template, and sends reset email.
- **Endpoint**: `POST /send-reset`
- **Body**:
  ```json
  {
      "domain": "mywebsite.com",
      "email": "existinguser@example.com"
  }
  ```

### 2.5 Verify Token
Validates the token from the user's link click. Tokens expire in 1 hour.
- **Endpoint**: `GET /verify-token?email=user@example.com&token=RAW_TOKEN&type=verify`
- **Query Params**:
  - `email`: User's email
  - `token`: The raw token generated in the link
  - `type`: Either `verify` or `reset`
- **Response**: `200 OK` on success, `400 Bad Request` if invalid or expired.

### 2.6 Fetch Connected Domains
- **Endpoint**: `GET /email-settings`

### 2.7 Update Custom Templates
- **Endpoint**: `PUT /email-settings/{domain}`
- **Body**:
  ```json
  {
      "verification_template": "Hello\n{{verification_link}}",
      "reset_template": "Reset: {{reset_link}}"
  }
  ```

---

## Security Details
1. **Password Encryption**: Uses Cryptography (Fernet) to encrypt SMTP passwords in the DB.
2. **Token Hashing**: Tokens are generated securely using `secrets` and stored directly as SHA-256 hashes inside the database. The raw token is sent in the URL and mathematically hashed upon validation.
3. **Database**: SQLite manages the `email_settings`, `email_tokens`, and `email_logs`.
