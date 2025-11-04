'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

export default function Dashboard() {
  const [day, setDay] = useState(null);
  const [posting, setPosting] = useState(false);
  const [closing, setClosing] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  // Modal state for Day Sales
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesErr, setSalesErr] = useState('');
  const [salesData, setSalesData] = useState(null);

  // Load latest day
  useEffect(() => {
    api('/days/latest')
      .then((d) => setDay(d || null))
      .catch(() => {});
  }, []);

  async function startDay() {
    try {
      setPosting(true);
      const d = await api('/days/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });
      setDay(d);
    } catch (e) {
      alert(readErr(e));
    } finally {
      setPosting(false);
    }
  }

  async function closeDay() {
    if (!day) return;
    try {
      setClosing(true);

      let next;
      if (day._id) {
        next = await api(`/days/${day._id}/close`, { method: 'PUT' });
      } else if (day.id) {
        next = await api(`/days/${day.id}/close`, { method: 'PUT' });
      } else if (day.date) {
        next = await api('/days/close', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: day.date }),
        });
      } else {
        throw new Error('No day identifier found');
      }
      setDay(next);
    } catch (e) {
      alert(readErr(e));
    } finally {
      setClosing(false);
    }
  }

  // Open modal and fetch sales for this day
  async function openDaySales() {
    if (!day?._id) {
      alert('No day selected.');
      return;
    }
    try {
      setSalesErr('');
      setSalesLoading(true);
      const res = await api(`/days/${day._id}/sales`);
      setSalesData(res);
      setSalesOpen(true);
    } catch (e) {
      setSalesErr(readErr(e));
      setSalesOpen(true);
    } finally {
      setSalesLoading(false);
    }
  }
  function closeDaySales() {
    setSalesOpen(false);
    setSalesErr('');
    setSalesData(null);
  }

  const isTodayOpen = day?.date === today && day?.isOpen;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-indigo-200/40 bg-gradient-to-tr from-indigo-50 via-white to-emerald-50 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📱 Mobile Shop — Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Open/close the day, make sales, and review totals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startDay}
              disabled={posting || isTodayOpen}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
              title="Start today's day"
            >
              {posting ? 'Opening…' : isTodayOpen ? 'Day Opened' : 'Start Day'}
            </button>

            {day?.isOpen && (
              <button
                onClick={closeDay}
                disabled={closing}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                title="Close the current day and lock today’s sales"
              >
                {closing ? 'Closing…' : 'Close Day'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Day card with eye icon to open sales modal */}
        <div className="relative cursor-pointer">
          <Stat
            title="Day"
            value={
              <div className="flex items-center gap-2">
                {day?.date || '—'}
                {day?._id && (
                  <button
                    type="button"
                    onClick={openDaySales}
                    title="View Day Sales"
                    className="inline-flex items-center justify-center rounded-full bg-gray-100 hover:bg-indigo-100 p-1 text-gray-600 hover:text-indigo-700 transition"
                  >
                    {/* Eye icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}
              </div>
            }
          />
        </div>

        <Stat title="Status" value={day?.isOpen ? 'Open' : (day ? 'Closed' : '—')} />
        <Stat title="Bills" value={fmtNum(day?.billsCount)} />
        <Stat title="Total Sales" value={fmtMoney(day?.totalSales)} />
      </div>

      {/* Quick links */}
      {/* <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <a href="/stocks" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition">📦 Stocks</a>
        <a href="/investors" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition">🤝 Investors</a>
        <a href="/credits" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition">💳 Credits</a>
        <a href="/bills/new" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition">🧾 Create Bill</a>
      </div> */}

      {/* Sales Modal */}
      <SalesModal
        open={salesOpen}
        onClose={closeDaySales}
        loading={salesLoading}
        error={salesErr}
        data={salesData}
      />
    </div>
  );
}

/* ---------- Modal for Day Sales ---------- */
function SalesModal({ open, onClose, loading, error, data }) {
  // ✅ Hooks first (always called, every render)
  const [q, setQ] = useState('');

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Derivations
  const items = useMemo(() => data?.items || [], [data]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(r =>
      [r.model, r.storage, String(r.buyPrice), String(r.sellPrice)]
        .some(v => String(v || '').toLowerCase().includes(s))
    );
  }, [items, q]);

  const totals = useMemo(() => {
    const count = filtered.length;
    const totalBuy = filtered.reduce((a, r) => a + Number(r.buyPrice || 0), 0);
    const totalSales = filtered.reduce((a, r) => a + Number(r.sellPrice || 0), 0);
    const totalProfit = filtered.reduce((a, r) => a + Number(r.profit || 0), 0);
    return { count, totalBuy, totalSales, totalProfit };
  }, [filtered]);

  // ✅ Early return AFTER hooks are declared/called
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* header */}
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div>
              <h3 className="text-lg font-semibold">📊 Day Sales</h3>
              {data?.day && (
                <p className="text-xs text-gray-600">
                  Day: <span className="font-medium">{data.day.date}</span>{' '}
                  · {data.day.isOpen ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Open</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">Closed</span>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-2.5 py-1.5 text-sm hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          {/* body */}
          <div className="max-h-[75vh] overflow-auto p-5">
            {loading ? (
              <div className="py-10 text-center text-gray-600">Loading…</div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{error}</div>
            ) : (
              <>
                {/* Totals */}
                <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat title="Bills" value={fmtNum(totals.count)} />
                  <Stat title="Total Buy" value={fmtMoney(totals.totalBuy)} />
                  <Stat title="Total Sales" value={fmtMoney(totals.totalSales)} />
                  <Stat title="Total Profit" value={fmtMoney(totals.totalProfit)} />
                </div>

                {/* Search */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase text-gray-600">Search</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                    placeholder="Model / storage / price"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Model</th>
                        <th className="px-4 py-3 font-semibold">Storage</th>
                        <th className="px-4 py-3 font-semibold">Ownership</th>
                        <th className="px-4 py-3 font-semibold">Buy</th>
                        <th className="px-4 py-3 font-semibold">Sell</th>
                        <th className="px-4 py-3 font-semibold">Profit</th>
                        <th className="px-4 py-3 font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={7}>No sales found.</td></tr>
                      ) : (
                        filtered.map(r => (
                          <tr key={r._id} className="border-t last:border-b">
                            <td className="px-4 py-3 font-medium text-gray-900">{r.model}</td>
                            <td className="px-4 py-3">{r.storage}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">{r.ownershipType}</span>
                            </td>
                            <td className="px-4 py-3">{fmtMoney(r.buyPrice)}</td>
                            <td className="px-4 py-3">{fmtMoney(r.sellPrice)}</td>
                            <td className="px-4 py-3 font-semibold">{fmtMoney(r.profit)}</td>
                            <td className="px-4 py-3 text-gray-500">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ---------- Small components & helpers ---------- */
function Stat({ title, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-xl font-bold text-gray-900">
        {typeof value === 'string' || typeof value === 'number' ? String(value) : value}
      </div>
    </div>
  );
}

function fmtNum(n) { return Number(n || 0).toLocaleString(); }
function fmtMoney(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function readErr(e) {
  try {
    const msg = typeof e === 'string' ? e : e?.message || '';
    const m = msg.match(/\{.*\}/s);
    if (m) return JSON.parse(m[0])?.message || 'Request failed';
    return msg || 'Request failed';
  } catch { return 'Request failed'; }
}
