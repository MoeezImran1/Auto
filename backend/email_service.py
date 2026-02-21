import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_smtp_connection(host: str, port: int, email: str, password: str) -> bool:
    """Verifies SMTP connection and authentication."""
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port)
        else:
            server = smtplib.SMTP(host, port)
            server.ehlo()
            server.starttls()
            server.ehlo()
            
        server.login(email, password)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"SMTP Connection failed: {str(e)}")
        return False

def send_email(host: str, port: int, username: str, password: str, sender_name: str, to_email: str, subject: str, html_body: str) -> bool:
    """Sends an email using the provided SMTP credentials."""
    try:
        msg = MIMEMultipart("alternative")
        msg['Subject'] = subject
        msg['From'] = f"{sender_name} <{username}>"
        msg['To'] = to_email

        # Attach text and html parts (currently only using basic body parsing)
        part = MIMEText(html_body, 'html' if '<' in html_body else 'plain')
        msg.attach(part)

        if port == 465:
            server = smtplib.SMTP_SSL(host, port)
        else:
            server = smtplib.SMTP(host, port)
            server.starttls()

        server.login(username, password)
        server.sendmail(username, to_email, msg.as_string())
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def render_template(template_str: str, **kwargs) -> str:
    """Renders an email template with provided variables."""
    template = Template(template_str)
    return template.render(**kwargs)
