'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

export default function Investors() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({}); // { [investorId]: { count, total, availableCount, availableTotal } }
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Load investors and their stats
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const investors = await api('/investors');
        setItems(investors);

        // Fetch phones for each investor in parallel and compute aggregates
        const details = await Promise.all(
          investors.map((i) => api(`/investors/${i._id}`).then((res) => ({ id: i._id, phones: res.phones || [] })))
        );

        const s = {};
        for (const d of details) {
          const count = d.phones.length;
          const total = d.phones.reduce((acc, p) => acc + Number(p.price || 0), 0);
          const unsold = d.phones.filter((p) => !p.isSold);
          const availableCount = unsold.length;
          const availableTotal = unsold.reduce((acc, p) => acc + Number(p.price || 0), 0);
          s[d.id] = { count, total, availableCount, availableTotal };
        }
        setStats(s);
      } catch (e) {
        setErr(extractError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addInvestor(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setErr('');
    try {
      await api('/investors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      setName('');
      // reload list + stats
      const investors = await api('/investors');
      setItems(investors);
      const details = await Promise.all(
        investors.map((i) => api(`/investors/${i._id}`).then((res) => ({ id: i._id, phones: res.phones || [] })))
      );
      const s = {};
      for (const d of details) {
        const count = d.phones.length;
        const total = d.phones.reduce((acc, p) => acc + Number(p.price || 0), 0);
        const unsold = d.phones.filter((p) => !p.isSold);
        const availableCount = unsold.length;
        const availableTotal = unsold.reduce((acc, p) => acc + Number(p.price || 0), 0);
        s[d.id] = { count, total, availableCount, availableTotal };
      }
      setStats(s);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Investors</h2>
          <p className="text-sm text-gray-500">Manage investors and see their phone counts and total value.</p>
        </div>
      </div>

      {/* Add Investor */}
      <form onSubmit={addInvestor} className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          required
          placeholder="Investor name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : '+ Add Investor'}
        </button>
      </form>

      {err && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Investor</th>
              <th className="px-4 py-3 font-semibold">Phones</th>
              <th className="px-4 py-3 font-semibold">Total Cash</th>
              <th className="px-4 py-3 font-semibold">Available</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-5 text-gray-500" colSpan={5}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  No investors yet. Add your first investor above.
                </td>
              </tr>
            ) : (
              items.map((i) => {
                const s = stats[i._id] || { count: 0, total: 0, availableCount: 0, availableTotal: 0 };
                return (
                  <tr key={i._id} className="border-t last:border-b">
                    <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                    <td className="px-4 py-3">{s.count}</td>
                    <td className="px-4 py-3">{formatCurrency(s.total)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {s.availableCount} phones · {formatCurrency(s.availableTotal)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/investors/${i._id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-50"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCurrency(n) {
  const x = Number(n || 0);
  // You can localize this if you want AED/PKR etc.
  return x.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function extractError(e) {
  try {
    const msg = typeof e === 'string' ? e : e?.message || '';
    const m = msg.match(/\{.*\}/s);
    if (m) {
      const o = JSON.parse(m[0]);
      return o?.message || 'Request failed';
    }
    return msg || 'Request failed';
  } catch {
    return 'Request failed';
  }
}
