import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdminDashboardModel,
  formatAdminDateLabel,
} from './adminFlow.js';

test('buildAdminDashboardModel normalizes live admin responses into dashboard-ready slices', () => {
  const model = buildAdminDashboardModel({
    stats: {
      toplam_kullanici: 42,
      toplam_mesaj: 150,
      toplam_konusma: 31,
      toplam_begeni: 12,
      toplam_begenmeme: 3,
    },
    categories: [
      { kategori: 'İş Hukuku', sayi: 12 },
      { kategori: 'Tüketici', sayi: 4 },
    ],
    feedback: {
      begeni: 12,
      begenmeme: 3,
      toplam: 15,
      begeni_orani: 0.8,
    },
    daily: [
      { tarih: '2026-04-19', mesaj_sayisi: 5, konusma_sayisi: 2, kullanici_sayisi: 1 },
      { tarih: '2026-04-20', mesaj_sayisi: 7, konusma_sayisi: 3, kullanici_sayisi: 2 },
    ],
    weakQueries: [
      { id: 'w1', soru: 'Örnek', max_skor: 0.42, kategori: 'Ceza' },
    ],
    users: [
      { id: 'u1', email: 'user@example.com', role: 'USER', is_active: true, created_at: '2026-04-01T09:30:00' },
    ],
  });

  assert.equal(model.cards[0].value, '42');
  assert.equal(model.cards[1].value, '150');
  assert.equal(model.cards[2].value, '31');
  assert.equal(model.cards[3].value, '%80');
  assert.deepEqual(model.daily.labels, ['19 Nis', '20 Nis']);
  assert.deepEqual(model.daily.messages, [5, 7]);
  assert.equal(model.feedback.up, 12);
  assert.equal(model.feedback.down, 3);
  assert.equal(model.weak[0].score, 0.42);
  assert.equal(model.users[0].joined, '1 Nis 2026');
  assert.equal(model.users[0].active, true);
});

test('formatAdminDateLabel produces a short Turkish date label for dashboard charts', () => {
  assert.equal(formatAdminDateLabel('2026-04-21'), '21 Nis');
});
