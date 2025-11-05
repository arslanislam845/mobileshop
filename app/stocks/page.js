'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

export default function StocksPage() {
  const [phones, setPhones] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // All unsold phones across Owner/Investor/Credit
        const [unsold, invs, creds] = await Promise.all([
          api('/phones/unsold'),
          api('/investors'),
          api('/credits'),
        ]);
        setPhones(unsold);
        setInvestors(invs);
        setCredits(creds);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Quick lookup maps for party names
  const investorName = useMemo(() => {
    const m = new Map();
    investors.forEach(i => m.set(i._id, i.name));
    return m;
  }, [investors]);

  const creditName = useMemo(() => {
    const m = new Map();
    credits.forEach(c => m.set(c._id, c.name));
    return m;
  }, [credits]);

  function partyFor(p) {
    if (p.ownershipType === 'OWNER') return 'Owner';
    if (p.ownershipType === 'INVESTOR') return investorName.get(p.investor) ?? '—';
    if (p.ownershipType === 'CREDIT') return creditName.get(p.creditParty) ?? '—';
    return '—';
  }

  async function refresh() {
    const unsold = await api('/phones/unsold');
    setPhones(unsold);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stocks</h2>
          <p className="text-sm text-gray-500">All available (unsold) phones from Owner, Investors, and Credit.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-indigo-500"
        >
          + Add Stock
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Model</th>
              <th className="px-4 py-3 font-semibold">Storage</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">IMEI</th>
              <th className="px-4 py-3 font-semibold">Ownership</th>
              <th className="px-4 py-3 font-semibold">Belongs To</th>
              <th className="px-4 py-3 font-semibold">Added</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-gray-500" colSpan={7}>Loading…</td>
              </tr>
            ) : phones.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-500 text-center" colSpan={7}>
                  No phones available. Click <span className="font-semibold">“Add Stock”</span> to add one.
                </td>
              </tr>
            ) : (
              phones.map(p => (
                <tr key={p._id} className="border-t last:border-b">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">{p.storage}</td>
                  <td className="px-4 py-3">{Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3">{p.imei || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                      {p.ownershipType === 'OWNER' ? 'Owner' : p.ownershipType === 'INVESTOR' ? 'Investor' : 'Credit'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{partyFor(p)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddStockModal
          investors={investors}
          credits={credits}
          onClose={() => setShowAdd(false)}
          onAdded={async () => { setShowAdd(false); await refresh(); }}
        />
      )}
    </div>
  );
}

/** Add Stock Modal/Form */
function AddStockModal({ investors, credits, onClose, onAdded }) {
  const [ownershipType, setOwnershipType] = useState('OWNER');
  const [form, setForm] = useState({ name: '', storage: '', price: '', imei: '' }); // 👈 IMEI in state
  const [investorId, setInvestorId] = useState('');
  const [creditPartyId, setCreditPartyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        storage: form.storage.trim(),
        price: Number(form.price),
        imei: form.imei.trim() || undefined, // 👈 send when present
      };
      if (!payload.name || !payload.storage || isNaN(payload.price)) {
        setError('Please fill all fields correctly.'); setSubmitting(false); return;
      }

      if (ownershipType === 'OWNER') {
        await api('/phones/owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else if (ownershipType === 'INVESTOR') {
        if (!investorId) { setError('Select an investor.'); setSubmitting(false); return; }
        await api(`/investors/${investorId}/phones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else if (ownershipType === 'CREDIT') {
        if (!creditPartyId) { setError('Select a credit party.'); setSubmitting(false); return; }
        await api(`/credits/${creditPartyId}/phones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      onAdded?.();
    } catch (e) {
      setError(extractError(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold">Add Stock</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          {/* Ownership */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Ownership</label>
            <select
              className="rounded-xl border border-gray-300 px-3 py-2"
              value={ownershipType}
              onChange={(e) => setOwnershipType(e.target.value)}
            >
              <option value="OWNER">Owner</option>
              <option value="INVESTOR">Investor</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>

          {/* Conditional party selector */}
          {ownershipType === 'INVESTOR' && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Investor</label>
              <select
                className="rounded-xl border border-gray-300 px-3 py-2"
                value={investorId}
                onChange={(e) => setInvestorId(e.target.value)}
              >
                <option value="">Select investor…</option>
                {investors.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
              </select>
            </div>
          )}
          {ownershipType === 'CREDIT' && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Credit Party</label>
              <select
                className="rounded-xl border border-gray-300 px-3 py-2"
                value={creditPartyId}
                onChange={(e) => setCreditPartyId(e.target.value)}
              >
                <option value="">Select credit party…</option>
                {credits.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Phone fields */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Model</label>
            <input
              className="rounded-xl border border-gray-300 px-3 py-2"
              placeholder="e.g. iPhone 13"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Storage</label>
            <input
              className="rounded-xl border border-gray-300 px-3 py-2"
              placeholder="e.g. 128GB"
              value={form.storage}
              onChange={e => setForm({ ...form, storage: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Price (Buy)</label>
            <input
              type="number"
              min="0"
              className="rounded-xl border border-gray-300 px-3 py-2"
              placeholder="e.g. 1200"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">IMEI (optional)</label>
            <input
              className="rounded-xl border border-gray-300 px-3 py-2"
              placeholder="e.g. 356938035643809"
              value={form.imei}
              onChange={e => setForm({ ...form, imei: e.target.value })}
              // If you want to restrict to digits & length, uncomment:
              // pattern="\d{14,16}"
              // title="Enter 14–16 digits"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
