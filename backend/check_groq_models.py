#!/usr/bin/env python3
"""
Test Groq API with available models
"""
import os
import sys
from dotenv import load_dotenv
from groq import Groq

load_dotenv(override=False)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

def check_groq_models():
    """Check Groq API and available models"""
    
    print("=" * 70)
    print("GROQ API VE MODELLER KONTROL")
    print("=" * 70)
    
    if not GROQ_API_KEY:
        print("\n❌ HATA: GROQ_API_KEY ayarlanmamış!")
        return False
    
    print("\n✅ API Key bulundu")
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        
        # List available models
        print("\n🔄 Kullanılabilir modeller sorgulanıyor...")
        models = client.models.list()
        
        print(f"\n📊 Toplam model sayısı: {len(models.data)}")
        print("\n📋 Mevcut Modeller:")
        
        model_names = []
        for model in models.data:
            print(f"   - {model.id}")
            model_names.append(model.id)
        
        # Test with a different model
        if model_names:
            test_model = model_names[0]
            print(f"\n🔄 Test: {test_model} modeli ile test mesajı gönderiliyor...")
            
            response = client.chat.completions.create(
                model=test_model,
                messages=[
                    {"role": "system", "content": "Sen yardımcı bir asistansın."},
                    {"role": "user", "content": "Selam"}
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
    success = check_groq_models()
    sys.exit(0 if success else 1)
