#!/usr/bin/env python3
"""
Test Groq API connectivity
"""
import os
import sys
from dotenv import load_dotenv
from groq import Groq

load_dotenv(override=False)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

def check_groq():
    """Check Groq API connectivity"""
    
    print("=" * 70)
    print("GROQ API KONTROL")
    print("=" * 70)
    
    if not GROQ_API_KEY:
        print("\n❌ HATA: GROQ_API_KEY ayarlanmamış!")
        return False
    
    print(f"\n📍 API Key bulundu (ilk 10 char): {GROQ_API_KEY[:10]}...")
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        print("\n✅ Groq client oluşturuldu")
        
        # Try a simple model call
        print("\n🔄 Test mesajı gönderiliyor...")
        response = client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[
                {"role": "system", "content": "Sen yardımcı bir asistansın."},
                {"role": "user", "content": "Merhaba"}
            ],
            max_tokens=50,
            timeout=30.0
        )
        
        print("✅ Groq API başarıyla çalışıyor!")
        print(f"\n📄 Test Yanıtı:")
        print(f"   Model: {response.model}")
        print(f"   Mesaj: {response.choices[0].message.content[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"\n❌ GROQ HATASI: {e}")
        return False

if __name__ == "__main__":
    success = check_groq()
    sys.exit(0 if success else 1)
