'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api';

export default function NewBill() {
  const [day, setDay] = useState(null);
  const [loadingDay, setLoadingDay] = useState(true);

  const [ownershipType, setOwnershipType] = useState('OWNER');
  const [investors, setInvestors] = useState([]);
  const [credits, setCredits] = useState([]);

  const [phones, setPhones] = useState([]);
  const [phonesLoading, setPhonesLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [salePrice, setSalePrice] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // filters
  const [selectedInvestor, setSelectedInvestor] = useState('');
  const [selectedCredit, setSelectedCredit] = useState('');
  const [search, setSearch] = useState('');

  // Load latest day, lookup lists
  useEffect(() => {
    (async () => {
      try {
        const d = await api('/days/latest');
        setDay(d);
      } catch {
        /* no day yet */
      } finally {
        setLoadingDay(false);
      }
    })();
  }, []);
  useEffect(() => { api('/investors').then(setInvestors).catch(() => {}); }, []);
  useEffect(() => { api('/credits').then(setCredits).catch(() => {}); }, []);

  // Load phones when ownership or its filter changes
  useEffect(() => {
    loadPhones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownershipType, selectedInvestor, selectedCredit]);

  async function loadPhones() {
    setErr('');
    setPhones([]);
    setSelected(null);
    setPhonesLoading(true);
    try {
      const extra = {};
      if (ownershipType === 'INVESTOR' && selectedInvestor) extra.investorId = selectedInvestor;
      if (ownershipType === 'CREDIT' && selectedCredit) extra.creditPartyId = selectedCredit;
      const params = new URLSearchParams({ ownershipType, ...extra }).toString();
      const list = await api(`/phones/unsold?${params}`);
      setPhones(list);
    } catch (e) {
      setErr(readErr(e));
    } finally {
      setPhonesLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return phones;
    return phones.filter(p =>
      [p.name, p.storage, String(p.price || '')].some(x => String(x || '').toLowerCase().includes(q))
    );
  }, [phones, search]);

  const isReady = !!(day && day.isOpen);
  const selectedPhone = useMemo(() => filtered.find(p => p._id === selected) || null, [filtered, selected]);
  const profitIfSold = useMemo(() => {
    const sp = Number(salePrice);
    const bp = Number(selectedPhone?.price || 0);
    if (!Number.isFinite(sp) || sp <= 0) return 0;
    return Math.max(0, sp - bp);
  }, [salePrice, selectedPhone]);

  async function submit(e) {
    e.preventDefault();
    try {
      setErr('');
      if (!isReady) return setErr('Open a day first from the Dashboard.');
      if (!selected) return setErr('Please select a phone to sell.');
      const sp = Number(salePrice);
      if (!Number.isFinite(sp) || sp <= 0) return setErr('Enter a valid sale price (> 0).');

      setSaving(true);
      await api('/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayId: day._id,
          phoneId: selected,
          salePrice: sp,
          ownershipType,
        }),
      });
      // Reset
      setSalePrice('');
      setSelected(null);
      setSearch('');
      await loadPhones();
      alert('✅ Bill created & phone marked sold');
    } catch (e) {
      setErr(readErr(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-indigo-200/40 bg-gradient-to-tr from-indigo-50 via-white to-emerald-50 p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🧷 Create Bill</h1>
            {loadingDay ? (
              <p className="mt-1 h-5 w-64 animate-pulse rounded bg-gray-200" />
            ) : day ? (
              <p className="mt-1 text-sm text-gray-600">
                Day: <span className="font-semibold">{day.date}</span> · <StatusBadge open={!!day.isOpen} />
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                No day is open. Open one from the <a className="underline" href="/">Dashboard</a>.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600">Ownership</label>
            <select
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
              value={ownershipType}
              onChange={(e) => {
                setOwnershipType(e.target.value);
                setSelectedInvestor('');
                setSelectedCredit('');
              }}
            >
              <option value="OWNER">Owner</option>
              <option value="INVESTOR">Investor</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>

          {ownershipType === 'INVESTOR' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Investor</label>
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                value={selectedInvestor}
                onChange={(e) => setSelectedInvestor(e.target.value)}
              >
                <option value="">All</option>
                {investors.map((i) => (
                  <option key={i._id} value={i._id}>{i.name}</option>
                ))}
              </select>
            </div>
          )}

          {ownershipType === 'CREDIT' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Credit Party</label>
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                value={selectedCredit}
                onChange={(e) => setSelectedCredit(e.target.value)}
              >
                <option value="">All</option>
                {credits.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600">Search</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
              placeholder="Model / storage / buy price"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Phone list & sale box */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Phones */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="text-base font-semibold">Available Phones</h3>
            <span className="text-xs text-gray-500">{filtered.length} item(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Select</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Storage</th>
                  <th className="px-4 py-3 font-semibold">Buy Price</th>
                  <th className="px-4 py-3 font-semibold">Added</th>
                </tr>
              </thead>
              <tbody>
                {phonesLoading ? (
                  <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={5}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={5}>No phones match.</td></tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p._id} className="border-t last:border-b">
                      <td className="px-4 py-3">
                        <input
                          type="radio"
                          name="phone"
                          checked={selected === p._id}
                          onChange={() => setSelected(p._id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3">{p.storage}</td>
                      <td className="px-4 py-3">{fmt(p.price)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill form */}
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Bill Details</h3>

          {err && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600">Selected phone</label>
            <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {selectedPhone ? (
                <div className="text-gray-800">
                  <b>{selectedPhone.name}</b> · {selectedPhone.storage}{' '}
                  <span className="text-gray-500">· Buy: {fmt(selectedPhone.price)}</span>
                </div>
              ) : (
                <span className="text-gray-500">No phone selected</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600">Sale Price</label>
            <input
              required
              type="number"
              min="0"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
              placeholder="Enter sale price"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Estimated Profit</span>
              <span className="font-semibold">{fmt(profitIfSold)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isReady || saving || !selected || !salePrice}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            title={!isReady ? 'Open a day first' : ''}
          >
            {saving ? 'Saving…' : 'Save Bill'}
          </button>

          {!isReady && (
            <p className="text-xs text-gray-500">
              You can only create bills when a day is open. Go to <a href="/" className="underline">Dashboard</a> to start a day.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

/* --- tiny pieces --- */
function StatusBadge({ open }) {
  return open ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Open</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">Closed</span>
  );
}

/* --- helpers --- */
function fmt(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function readErr(e) {
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
