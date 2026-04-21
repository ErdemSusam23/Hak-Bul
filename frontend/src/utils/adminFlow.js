export function formatAdminDateLabel(value) {
  if (!value) return '';

  const normalized = value.includes('T') ? value : `${value}T00:00:00Z`;
  return new Date(normalized).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('tr-TR');
}

export function normalizeRoleName(role) {
  return String(role || 'user').trim().toLowerCase();
}

function toRoleOptionValue(role) {
  return normalizeRoleName(role).toUpperCase();
}

function normalizePositiveRatio(feedback) {
  const rawRatio = feedback?.begeni_orani;
  if (typeof rawRatio === 'number') {
    return rawRatio > 1 ? rawRatio / 100 : rawRatio;
  }

  return feedback?.toplam ? (feedback.begeni / feedback.toplam) : 0;
}

function formatPercent(value) {
  return `%${Math.round((value || 0) * 100)}`;
}

export function buildAdminDashboardModel({
  stats,
  categories = [],
  feedback,
  daily = [],
  weakQueries = [],
  users = [],
}) {
  const positiveRatio = normalizePositiveRatio(feedback);

  return {
    cards: [
      { label: 'Yeni Kullanıcı', value: formatCount(stats?.toplam_kullanici) },
      { label: 'Mesaj', value: formatCount(stats?.toplam_mesaj) },
      { label: 'Konuşma', value: formatCount(stats?.toplam_konusma) },
      { label: 'Beğeni Oranı', value: formatPercent(positiveRatio) },
    ],
    categories: categories.map((item) => ({
      key: item.kategori,
      label: item.kategori,
      count: item.sayi,
    })),
    daily: {
      labels: daily.map((item) => formatAdminDateLabel(item.tarih)),
      messages: daily.map((item) => item.mesaj_sayisi),
      conversations: daily.map((item) => item.konusma_sayisi || 0),
      users: daily.map((item) => item.kullanici_sayisi || 0),
    },
    feedback: {
      up: feedback?.begeni || 0,
      down: feedback?.begenmeme || 0,
      total: feedback?.toplam || 0,
      ratio: positiveRatio || 0,
    },
    weak: weakQueries.map((item) => ({
      id: item.id,
      q: item.soru,
      score: item.max_skor,
      cat: item.kategori || 'Genel',
    })),
    users: users.map((item) => ({
      id: item.id,
      email: item.email,
      role: toRoleOptionValue(item.role),
      active: item.is_active,
      joined: new Date(item.created_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    })),
  };
}
