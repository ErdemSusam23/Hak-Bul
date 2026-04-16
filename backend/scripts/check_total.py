#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from collections import defaultdict

load_dotenv()
client = QdrantClient(url=os.getenv('QDRANT_URL'), api_key=os.getenv('QDRANT_API_KEY'), timeout=60)

col = client.get_collection('hukuk_chunks')
print(f'\n🎯 TOPLAM VEKTÖR: {col.points_count:,}')

if col.points_count >= 1388:
    print(f'✅ 2x HEDEFİ AŞTI! ({694} → {col.points_count})')
if col.points_count >= 2082:
    print(f'✅ 3x HEDEFİ AŞTI! ({694} → {col.points_count})')

print()

# Breakdown
resp = client.scroll('hukuk_chunks', limit=100000, with_payload=True, with_vectors=False)
cats = defaultdict(int)
for p in resp[0]:
    c = p.payload.get('hukuk_alani', 'unknown')
    cats[c] += 1

print(f'Kategori Dağılımı ({len(cats)} kategori):')
print('-' * 50)
for c in sorted(cats.keys()):
    cnt = cats[c]
    pct = (cnt / col.points_count * 100) if col.points_count > 0 else 0
    print(f'  {c:30s} | {cnt:6d} ({pct:5.1f}%)')
