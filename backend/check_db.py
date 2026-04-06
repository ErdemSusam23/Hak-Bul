#!/usr/bin/env python3
"""
Check database status and schema
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import inspect, create_engine, text
from config import settings

load_dotenv(override=False)

def check_database():
    """Check database connection and schema"""
    
    print("=" * 70)
    print("VERİTABANI KONTROL VE ŞEMA")
    print("=" * 70)
    
    print(f"\n📍 DATABASE_URL: {settings.DATABASE_URL}")
    
    try:
        # Create engine
        engine = create_engine(settings.DATABASE_URL)
        
        # Test connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("\n✅ VERİTABANI BAĞLANTISI BAŞARILI!")
        
        # Get inspector
        inspector = inspect(engine)
        
        # Get all tables
        tables = inspector.get_table_names()
        print(f"\n📊 Toplam Tablo Sayısı: {len(tables)}")
        
        if tables:
            print("\n📋 Tablolar ve Satır Sayıları:")
            
            for table in sorted(tables):
                try:
                    with engine.connect() as connection:
                        result = connection.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.scalar()
                        print(f"   ✅ {table:30} - {count:6,} satır")
                except Exception as e:
                    print(f"   ⚠️  {table:30} - Hata: {str(e)[:50]}")
        
        # Check for migration history
        print("\n🔄 Alembic Migration Tablosu:")
        try:
            with engine.connect() as connection:
                result = connection.execute(text("SELECT version, description, installed_on FROM alembic_version ORDER BY version DESC LIMIT 10"))
                rows = result.fetchall()
                if rows:
                    for version, description, installed_on in rows:
                        print(f"   ✅ {version}: {description}")
                else:
                    print("   ⚠️  Migration tablosu mevcuttur ama veri yok")
        except Exception as e:
            print(f"   ❌ Hata: {e}")
        
        print("\n")
        return True
        
    except Exception as e:
        print(f"\n❌ VERİTABANI HATASI: {e}")
        return False

if __name__ == "__main__":
    success = check_database()
    sys.exit(0 if success else 1)
