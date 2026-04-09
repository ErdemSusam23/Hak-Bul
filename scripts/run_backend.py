#!/usr/bin/env python3
"""Run backend server"""
import os
import sys

# Set working directory
os.chdir(r"c:\Users\yagiz\OneDrive\Belgeler\GitHub\Hak-Bul\backend")
sys.path.insert(0, ".")

# Import and run
from main import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
