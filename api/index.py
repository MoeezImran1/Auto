import sys
import os

# Add the backend directory to Python path so Vercel can find the modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from main import app
