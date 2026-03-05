import sqlite3
conn = sqlite3.connect('C:/Hak-Bul/backend/hakbul.db')
tables = [t[0] for t in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tablolar:", tables)
