#!/usr/bin/env python3
"""
Check database schema details
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import inspect, create_engine, text
from config import settings

load_dotenv(override=False)

def check_database_detailed():
    """Check database schema in detail"""
    
    print("=" * 70)
    print("VERİTABANI ŞEMA DETAY KONTROL")
    print("=" * 70)
    
    try:
        engine = create_engine(settings.DATABASE_URL)
        inspector = inspect(engine)
        
        # Check specific tables
        important_tables = [
            'users', 
            'chat_history', 
            'message_feedback',
            'refresh_tokens',
            'shared_conversations',
            'weak_queries',
            'forum_threads',
            'forum_replies',
            'forum_votes'
        ]
        
        print("\n📋 TABLO ŞEMALARI:")
        for table in important_tables:
            if table in inspector.get_table_names():
                print(f"\n✅ {table}:")
                columns = inspector.get_columns(table)
                for col in columns:
                    col_type = str(col['type'])
                    nullable = "NULL" if col['nullable'] else "NOT NULL"
                    print(f"   - {col['name']:30} {col_type:20} {nullable}")
            else:
                print(f"\n❌ {table}: MEVCUT DEĞIL")
        
        # Check alembic_version table
        print(f"\n🔄 alembic_version Tablosu:")
        if 'alembic_version' in inspector.get_table_names():
            columns = inspector.get_columns('alembic_version')
            for col in columns:
                col_type = str(col['type'])
                print(f"   - {col['name']:30} {col_type}")
            
            # Try to read version
            with engine.connect() as connection:
                try:
                    result = connection.execute(text("SELECT * FROM alembic_version"))
                    row = result.fetchone()
                    if row:
                        print(f"\n   Current Migration: {row[0]}")
                except Exception as e:
                    print(f"   Hata okuması: {e}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ HATATA: {e}")
        return False

if __name__ == "__main__":
    success = check_database_detailed()
    sys.exit(0 if success else 1)
