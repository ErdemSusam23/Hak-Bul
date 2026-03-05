import sys
sys.path.insert(0, r'c:\Hak-Bul\backend')

import os
os.environ['DATABASE_URL'] = 'sqlite:///C:/Hak-Bul/backend/hakbul.db'
os.environ['JWT_SECRET_KEY'] = '3f8a2c1d9e4b7f6a0c5d2e8b1a4f7c3d9e2b5a8f1c4e7b0d3a6f9c2e5b8a1d4'

try:
    from db.session import SessionLocal
    from models.user import User
    from auth.security import hash_password

    db = SessionLocal()
    print("DB baglantisi tamam")

    users = db.query(User).all()
    print(f"Mevcut kullaniciler: {len(users)}")

    # Test kullanici olustur
    user = User(email="pytest@hakbul.com", password_hash=hash_password("Test1234"))
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"Kullanici olusturuldu: {user.id} - {user.email} - {user.role}")
    db.close()
except Exception as e:
    import traceback
    traceback.print_exc()
