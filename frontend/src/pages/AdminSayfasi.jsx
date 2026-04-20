import { useState } from 'react';
import { Icon, Toggle } from '../components/ui';
import { adminStats, categories } from '../data/mockData';

function LineChart({ data, labels }) {
  const w = 640, h = 180, pad = 24;
  const max = Math.max(...data) * 1.15;
  const points = data.map((v, i) => [
    pad + (w - pad * 2) * i / (data.length - 1),
    h - pad - (v / max) * (h - pad * 2),
  ]);
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = path + ` L${w - pad},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + (h - pad * 2) * t} y2={pad + (h - pad * 2) * t}
          stroke="var(--line)" strokeDasharray="2 4" />
      ))}
      <path d={area} fill="url(#ag)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.6" />
      ))}
      {labels.map((l, i) => (
        <text key={i} x={points[i][0]} y={h - 6} fontSize="10" textAnchor="middle" fill="var(--ink-muted)">{l}</text>
      ))}
    </svg>
  );
}

function Donut({ up, down }) {
  const total = up + down;
  const upFrac = up / total;
  const R = 42, C = 2 * Math.PI * R;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--line)" strokeWidth="12" />
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--accent)" strokeWidth="12"
        strokeDasharray={`${C * upFrac} ${C}`} transform="rotate(-90 60 60)" strokeLinecap="butt" />
      <text x="60" y="58" textAnchor="middle" fontSize="18" fontWeight="500" fill="var(--ink)"
        fontFamily="var(--font-display)">{Math.round(upFrac * 100)}%</text>
      <text x="60" y="76" textAnchor="middle" fontSize="10" fill="var(--ink-muted)">olumlu</text>
    </svg>
  );
}

export default function AdminSayfasi() {
  const [roleEdits, setRoleEdits] = useState({});
  const d = adminStats;
  const maxCat = Math.max(...categories.map(c => c.count));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <div className="label mb-2 flex items-center gap-2"><Icon name="shield" size={12} /> Admin</div>
          <h1 className="font-display text-[40px] leading-[1.05]" style={{ letterSpacing: '-0.02em' }}>
            Kontrol Paneli
          </h1>
          <p className="text-ink-muted text-sm mt-2">Son 30 gün · canlı veri</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn btn-outline text-xs"><Icon name="calendar" size={13} /> Son 30 gün</button>
          <button className="btn btn-outline text-xs"><Icon name="download" size={13} /> CSV</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {d.cards.map((c, i) => (
          <div key={i} className="card p-5">
            <div className="label">{c.label}</div>
            <div className="font-display text-[36px] mt-2 leading-none" style={{ letterSpacing: '-0.02em' }}>
              {c.value}
            </div>
            <div className="mt-3 text-xs flex items-center gap-1" style={{ color: c.up ? 'var(--success)' : 'var(--danger)' }}>
              <Icon name={c.up ? 'trending-up' : 'trending-down'} size={13} />
              {c.delta}
              <span className="text-ink-faint ml-1">vs. önceki</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-4 mb-8">
        <div className="col-span-12 lg:col-span-8 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="label">Günlük Aktivite</div>
              <div className="text-sm text-ink-muted mt-0.5">Son 7 gün · mesaj sayısı</div>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} /> Mesaj
              </span>
            </div>
          </div>
          <LineChart data={d.daily} labels={d.dailyLabels} />
        </div>

        <div className="col-span-12 lg:col-span-4 card p-5">
          <div className="label">Geri Bildirim Oranı</div>
          <div className="flex items-center gap-6 mt-4">
            <Donut up={d.feedback.up} down={d.feedback.down} />
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <Icon name="thumbs-up" size={13} className="text-accent" />
                  <span className="text-ink-muted text-xs">Olumlu</span>
                </div>
                <div className="font-display text-[22px]">{d.feedback.up.toLocaleString('tr-TR')}</div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Icon name="thumbs-down" size={13} style={{ color: 'var(--danger)' }} />
                  <span className="text-ink-muted text-xs">Olumsuz</span>
                </div>
                <div className="font-display text-[22px]">{d.feedback.down.toLocaleString('tr-TR')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category + weak queries */}
      <div className="grid grid-cols-12 gap-4 mb-8">
        <div className="col-span-12 lg:col-span-7 card p-5">
          <div className="label mb-4">Kategori Dağılımı</div>
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.key} className="flex items-center gap-3 text-sm">
                <div className="w-28 text-ink-soft truncate">{c.label}</div>
                <div className="flex-1 h-5 rounded-sm relative overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
                  <div className="h-full rounded-sm" style={{ width: (c.count / maxCat * 100) + '%', background: 'var(--accent)' }} />
                </div>
                <div className="w-14 text-right font-mono text-[11px] text-ink-muted">{c.count.toLocaleString('tr-TR')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="label">Zayıf Yanıtlar</div>
            <span className="text-[11px] text-ink-muted">güven skoru &lt; 0.6</span>
          </div>
          <div className="space-y-3">
            {d.weak.map((w, i) => (
              <div key={i} className="p-3 hairline rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="chip text-[10px] py-0 px-1.5">{w.cat}</span>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: w.score < 0.45 ? 'var(--danger)' : 'var(--warn)' }}
                  >
                    {w.score.toFixed(2)}
                  </span>
                </div>
                <div className="text-[13px] text-ink-soft leading-snug">{w.q}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 hairline-b">
          <div>
            <div className="label">Kullanıcı Yönetimi</div>
            <div className="text-sm text-ink-muted mt-0.5">{d.users.length} kullanıcı</div>
          </div>
          <div className="relative">
            <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="pl-8 pr-2 py-1.5 text-sm bg-surface-muted rounded-md border border-line w-56"
              placeholder="E-posta ara…"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-ink-muted bg-surface-muted">
                {['E-posta', 'Rol', 'Durum', 'Katılım', ''].map((h, i) => (
                  <th key={i} className={'text-left font-medium px-5 py-3 ' + (i === 4 ? 'w-10' : '')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.users.map((u, i) => {
                const role = roleEdits[i] || u.role;
                return (
                  <tr key={i} className="hairline-b last:border-b-0 hover:bg-surface-muted">
                    <td className="px-5 py-3 font-mono text-[12.5px]">{u.email}</td>
                    <td className="px-5 py-3">
                      <select
                        value={role}
                        onChange={e => setRoleEdits(r => ({ ...r, [i]: e.target.value }))}
                        className="text-[11px] font-medium px-2 py-1 rounded border border-line bg-transparent"
                        style={{
                          color: role === 'ADMIN' ? 'var(--accent)' : role === 'LAWYER' ? 'var(--highlight)' : 'var(--ink-soft)',
                        }}
                      >
                        <option>USER</option>
                        <option>LAWYER</option>
                        <option>ADMIN</option>
                      </select>
                    </td>
                    <td className="px-5 py-3"><Toggle defaultOn={u.active} /></td>
                    <td className="px-5 py-3 text-ink-muted font-mono text-[12px]">{u.joined}</td>
                    <td className="px-5 py-3 text-right">
                      <button className="p-1.5 rounded hover:bg-surface text-ink-muted">
                        <Icon name="more-horizontal" size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
