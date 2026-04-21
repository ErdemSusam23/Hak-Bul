import { useDeferredValue, useEffect, useState } from 'react';
import { Icon } from '../components/ui';
import {
  adminFeedbackOzetiAPI,
  adminGunlukAktiviteAPI,
  adminIstatistikAPI,
  adminKategoriDagilimiAPI,
  adminKullaniciDurumAPI,
  adminKullaniciListesiAPI,
  adminRolGuncelleAPI,
  adminZayifSorguListesiAPI,
} from '../api/client';
import { buildAdminDashboardModel } from '../utils/adminFlow';

function LineChart({ data, labels }) {
  if (!data.length) {
    return (
      <div className="h-48 grid place-items-center text-sm text-ink-muted">
        Son 7 güne ait aktivite verisi henüz oluşmadı.
      </div>
    );
  }

  const w = 640;
  const h = 180;
  const pad = 24;
  const max = Math.max(...data, 1) * 1.15;
  const points = data.map((value, index) => ([
    pad + ((w - (pad * 2)) * index) / Math.max(data.length - 1, 1),
    h - pad - ((value / max) * (h - (pad * 2))),
  ]));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ');
  const area = `${path} L${w - pad},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
      <defs>
        <linearGradient id="admin-chart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((tick) => (
        <line
          key={tick}
          x1={pad}
          x2={w - pad}
          y1={pad + ((h - (pad * 2)) * tick)}
          y2={pad + ((h - (pad * 2)) * tick)}
          stroke="var(--line)"
          strokeDasharray="2 4"
        />
      ))}
      <path d={area} fill="url(#admin-chart)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <circle key={labels[index]} cx={point[0]} cy={point[1]} r="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.6" />
      ))}
      {labels.map((label, index) => (
        <text key={label} x={points[index][0]} y={h - 6} fontSize="10" textAnchor="middle" fill="var(--ink-muted)">
          {label}
        </text>
      ))}
    </svg>
  );
}

function Donut({ up, down }) {
  const total = Math.max(up + down, 1);
  const upFraction = up / total;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--line)" strokeWidth="12" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="12"
        strokeDasharray={`${circumference * upFraction} ${circumference}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" fontSize="18" fontWeight="500" fill="var(--ink)" fontFamily="var(--font-display)">
        %{Math.round(upFraction * 100)}
      </text>
      <text x="60" y="76" textAnchor="middle" fontSize="10" fill="var(--ink-muted)">olumlu</text>
    </svg>
  );
}

function emptyModel() {
  return buildAdminDashboardModel({
    stats: null,
    categories: [],
    feedback: null,
    daily: [],
    weakQueries: [],
    users: [],
  });
}

function mapAdminUser(updatedUser) {
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    active: updatedUser.is_active,
    joined: new Date(updatedUser.created_at).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  };
}

export default function AdminSayfasi({ toast }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [model, setModel] = useState(() => emptyModel());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [
          stats,
          categories,
          feedback,
          daily,
          usersResponse,
          weakQueries,
        ] = await Promise.all([
          adminIstatistikAPI(),
          adminKategoriDagilimiAPI(),
          adminFeedbackOzetiAPI(),
          adminGunlukAktiviteAPI(7),
          adminKullaniciListesiAPI({ q: deferredSearch }),
          adminZayifSorguListesiAPI(8),
        ]);

        if (!active) return;

        setModel(buildAdminDashboardModel({
          stats,
          categories,
          feedback,
          daily,
          weakQueries,
          users: usersResponse.kullanicilar || [],
        }));
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.response?.data?.detail || loadError.message || 'Admin verileri yüklenemedi.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [deferredSearch]);

  const replaceUser = (updatedUser) => {
    setModel((current) => ({
      ...current,
      users: current.users.map((item) => (
        item.id === updatedUser.id ? mapAdminUser(updatedUser) : item
      )),
    }));
  };

  const handleRoleChange = async (userId, nextRole) => {
    const user = model.users.find((item) => item.id === userId);
    if (!user || user.role === nextRole) return;

    setBusyKey(`${userId}:role`);

    try {
      const updatedUser = await adminRolGuncelleAPI(userId, nextRole);
      replaceUser(updatedUser);
      toast?.('Kullanıcı rolü güncellendi.');
    } catch (actionError) {
      toast?.(actionError?.response?.data?.detail || 'Kullanıcı rolü güncellenemedi.', 'error');
    } finally {
      setBusyKey('');
    }
  };

  const handleStatusChange = async (userId, nextActive) => {
    setBusyKey(`${userId}:status`);

    try {
      const updatedUser = await adminKullaniciDurumAPI(userId, nextActive);
      replaceUser(updatedUser);
      toast?.(nextActive ? 'Kullanıcı yeniden aktifleştirildi.' : 'Kullanıcı pasife alındı.');
    } catch (actionError) {
      toast?.(actionError?.response?.data?.detail || 'Kullanıcı durumu güncellenemedi.', 'error');
    } finally {
      setBusyKey('');
    }
  };

  const maxCategoryCount = Math.max(...model.categories.map((item) => item.count), 1);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <div className="label mb-2 flex items-center gap-2"><Icon name="shield" size={12} /> Admin</div>
          <h1 className="font-display text-[40px] leading-[1.05]" style={{ letterSpacing: '-0.02em' }}>
            Kontrol Paneli
          </h1>
          <p className="text-ink-muted text-sm mt-2">Canlı sistem verileri ve moderasyon işlemleri</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="chip text-[11px] py-1.5 px-3">
            <Icon name="activity" size={12} /> Son 7 gün
          </div>
          <div className="chip text-[11px] py-1.5 px-3">
            <Icon name="database" size={12} /> Gerçek API
          </div>
        </div>
      </div>

      {loading && (
        <div className="card p-4 text-sm text-ink-muted mb-6">
          Admin verileri yükleniyor…
        </div>
      )}

      {!loading && error && (
        <div className="card p-4 text-sm mb-6" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {!error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {model.cards.map((card) => (
              <div key={card.label} className="card p-5">
                <div className="label">{card.label}</div>
                <div className="font-display text-[36px] mt-2 leading-none" style={{ letterSpacing: '-0.02em' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4 mb-8">
            <div className="col-span-12 lg:col-span-8 card p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="label">Günlük Aktivite</div>
                  <div className="text-sm text-ink-muted mt-0.5">Son 7 gün içindeki toplam mesaj sayısı</div>
                </div>
                <div className="text-[11px] text-ink-muted flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                  Mesaj
                </div>
              </div>
              <LineChart data={model.daily.messages} labels={model.daily.labels} />
            </div>

            <div className="col-span-12 lg:col-span-4 card p-5">
              <div className="label">Geri Bildirim Özeti</div>
              <div className="flex items-center gap-6 mt-4">
                <Donut up={model.feedback.up} down={model.feedback.down} />
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon name="thumbs-up" size={13} className="text-accent" />
                      <span className="text-ink-muted text-xs">Olumlu</span>
                    </div>
                    <div className="font-display text-[22px]">{model.feedback.up.toLocaleString('tr-TR')}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon name="thumbs-down" size={13} style={{ color: 'var(--danger)' }} />
                      <span className="text-ink-muted text-xs">Olumsuz</span>
                    </div>
                    <div className="font-display text-[22px]">{model.feedback.down.toLocaleString('tr-TR')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mb-8">
            <div className="col-span-12 lg:col-span-7 card p-5">
              <div className="label mb-4">Kategori Dağılımı</div>
              <div className="space-y-2">
                {model.categories.length === 0 ? (
                  <div className="text-sm text-ink-muted">Kategori verisi henüz yok.</div>
                ) : (
                  model.categories.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 text-sm">
                      <div className="w-32 text-ink-soft truncate">{item.label}</div>
                      <div className="flex-1 h-5 rounded-sm relative overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
                        <div
                          className="h-full rounded-sm"
                          style={{ width: `${(item.count / maxCategoryCount) * 100}%`, background: 'var(--accent)' }}
                        />
                      </div>
                      <div className="w-14 text-right font-mono text-[11px] text-ink-muted">{item.count.toLocaleString('tr-TR')}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="label">Zayıf Sorgular</div>
                <span className="text-[11px] text-ink-muted">maks. skor &lt; 0.6</span>
              </div>
              <div className="space-y-3">
                {model.weak.length === 0 ? (
                  <div className="text-sm text-ink-muted">Zayıf sorgu kaydı bulunmuyor.</div>
                ) : (
                  model.weak.map((item) => (
                    <div key={item.id} className="p-3 hairline rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="chip text-[10px] py-0 px-1.5">{item.cat}</span>
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: item.score < 0.45 ? 'var(--danger)' : 'var(--warn)' }}
                        >
                          {item.score.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[13px] text-ink-soft leading-snug">{item.q}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-5 hairline-b gap-4">
              <div>
                <div className="label">Kullanıcı Yönetimi</div>
                <div className="text-sm text-ink-muted mt-0.5">{model.users.length} kullanıcı</div>
              </div>
              <div className="relative">
                <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8 pr-2 py-1.5 text-sm bg-surface-muted rounded-md border border-line w-56"
                  placeholder="E-posta ara…"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-ink-muted bg-surface-muted">
                    {['E-posta', 'Rol', 'Durum', 'Katılım', 'İşlem'].map((heading) => (
                      <th key={heading} className="text-left font-medium px-5 py-3">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {model.users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-sm text-ink-muted">
                        Bu filtre için kullanıcı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    model.users.map((user) => (
                      <tr key={user.id} className="hairline-b last:border-b-0 hover:bg-surface-muted">
                        <td className="px-5 py-3 font-mono text-[12.5px]">{user.email}</td>
                        <td className="px-5 py-3">
                          <select
                            value={user.role}
                            disabled={busyKey === `${user.id}:role`}
                            onChange={(event) => handleRoleChange(user.id, event.target.value)}
                            className="text-[11px] font-medium px-2 py-1 rounded border border-line bg-transparent"
                          >
                            <option value="USER">USER</option>
                            <option value="LAWYER">LAWYER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="chip text-[11px] py-1 px-2"
                            style={{
                              color: user.active ? 'var(--success)' : 'var(--danger)',
                              borderColor: user.active ? 'color-mix(in srgb,var(--success) 40%,var(--line))' : 'color-mix(in srgb,var(--danger) 40%,var(--line))',
                            }}
                          >
                            {user.active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-ink-muted font-mono text-[12px]">{user.joined}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => handleStatusChange(user.id, !user.active)}
                            disabled={busyKey === `${user.id}:status`}
                            className="btn btn-outline text-xs"
                          >
                            <Icon name={user.active ? 'user-x' : 'user-check'} size={13} />
                            {user.active ? 'Pasife Al' : 'Aktifleştir'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
