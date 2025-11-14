'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function InvestorDetail({ params }) {
  const { id } = params;
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  // add phone
  const [form, setForm] = useState({ name: '', storage: '', price: '', imei: '' });
  const [saving, setSaving] = useState(false);

  // edit
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', storage: '', price: '', imei: '' });
  const [editSaving, setEditSaving] = useState(false);

  // sell
  const [sellId, setSellId] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellSaving, setSellSaving] = useState(false);

  // delete busy
  const [busyId, setBusyId] = useState(null);

  // payouts
  const [paying, setPaying] = useState(false);
  const [payout, setPayout] = useState({ amount: '', date: '', note: '' });

  async function load() {
    try {
      setErr('');
      const res = await api(`/investors/${id}`);
      setData(res);
    } catch (e) {
      setErr(extractError(e));
    }
  }
  useEffect(() => { load(); }, [id]);

  async function addPhone(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.storage.trim() || !form.price) return;
    setSaving(true);
    setErr('');
    try {
      await api(`/investors/${id}/phones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          storage: form.storage.trim(),
          price: Number(form.price),
          imei: form.imei.trim() || undefined,
        }),
      });
      setForm({ name: '', storage: '', price: '', imei: '' });
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  // ⚠️ No hooks below this line
  const investor = data?.investor || { name: '', payouts: [] };
  const phones = data?.phones ?? [];
  const payouts = data?.payouts ?? investor.payouts ?? [];

  // server-side totals if provided
  const totals = data?.summary || data?.totals || null;

  // profit helpers
  const profit = (p) =>
    typeof p.sellPrice === 'number'
      ? Math.max(0, Number(p.sellPrice) - Number(p.price || 0))
      : 0;
  const investorCut = (p) => profit(p) / 2;

  // compute client-side if server didn't send totals
  const buyTotal = totals?.buyTotal ?? sum(phones.map(p => p.price));
  const investorProfitTotal =
    totals?.investorProfitTotal ?? sum(phones.filter(p => p.isSold).map(investorCut));
  const payoutsTotal = totals?.payoutsTotal ?? sum(payouts.map(x => x.amount));
  const totalCash = totals?.totalCash ?? Math.max(0, buyTotal + investorProfitTotal - payoutsTotal);

  const unsold = phones.filter(p => !p.isSold);
  const availCount = unsold.length;
  const availTotal = sum(unsold.map(p => p.price));

  // edit
  function startEdit(p) {
    if (p.isSold) return;
    setSellId(null);
    setEditId(p._id);
    setEditForm({
      name: p.name,
      storage: p.storage,
      price: String(p.price ?? ''),
      imei: p.imei || '',
    });
  }

  async function saveEdit() {
    if (!editId) return;
    setEditSaving(true);
    try {
      await api(`/phones/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          storage: editForm.storage.trim(),
          price: Number(editForm.price),
          imei: editForm.imei.trim() || undefined,
        }),
      });
      setEditId(null);
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setEditSaving(false);
    }
  }

  function cancelEdit() {
    setEditId(null);
  }

  // sell
  function startSell(p) {
    if (p.isSold) return;
    setEditId(null);
    setSellId(p._id);
    setSellPrice(String(p.sellPrice ?? p.price ?? ''));
  }

  async function saveSell() {
    if (!sellId) return;
    const priceNum = Number(sellPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setErr('Sell price must be a non-negative number');
      return;
    }
    setSellSaving(true);
    try {
      await api(`/phones/${sellId}/sell`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellPrice: priceNum }),
      });
      setSellId(null);
      setSellPrice('');
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setSellSaving(false);
    }
  }

  function cancelSell() {
    setSellId(null);
    setSellPrice('');
  }

  // delete
  async function removePhone(p) {
    if (p.isSold) return setErr('Cannot delete a sold phone');
    if (!confirm(`Delete "${p.name} ${p.storage}"?`)) return;
    setBusyId(p._id);
    try {
      await api(`/phones/${p._id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setBusyId(null);
    }
  }

  // payouts
  async function addPayout(e) {
    e.preventDefault();
    const amt = Number(payout.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr('Payout amount must be > 0');
      return;
    }
    setPaying(true);
    setErr('');
    try {
      await api(`/investors/${id}/payouts`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          date: payout.date || undefined,
          note: payout.note?.trim() || undefined,
        }),
      });
      setPayout({ amount: '', date: '', note: '' });
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setPaying(false);
    }
  }

  async function deletePayout(payId) {
    if (!confirm('Delete this payout?')) return;
    try {
      await api(`/investors/${id}/payouts/${payId}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setErr(extractError(e));
    }
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600 shadow-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Investor</h2>
          <p className="text-sm text-gray-500">
            Manage phones & payouts for{' '}
            <span className="font-medium text-gray-700">{investor.name}</span>.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat title="Pending Cash (net)" value={formatCurrency(totalCash)} />
        <Stat title="Buy Value (all)" value={formatCurrency(buyTotal)} />
        <Stat title="Investor Profit (50%)" value={formatCurrency(investorProfitTotal)} />
        <Stat title="Payouts (paid to investor)" value={formatCurrency(payoutsTotal)} />
        <Stat
          title="Available (Unsold)"
          value={`${availCount} · ${formatCurrency(availTotal)}`}
        />
      </div>

      {err && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Record Payout */}
      <form
        onSubmit={addPayout}
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <h3 className="text-lg font-semibold">Record Payout to Investor</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            type="number"
            min="0"
            step="1"
            required
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Amount (e.g. 1000)"
            value={payout.amount}
            onChange={(e) => setPayout({ ...payout, amount: e.target.value })}
          />
          <input
            type="date"
            className="rounded-xl border border-gray-300 px-3 py-2"
            value={payout.date}
            onChange={(e) => setPayout({ ...payout, date: e.target.value })}
          />
          <input
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Note (optional)"
            value={payout.note}
            onChange={(e) => setPayout({ ...payout, note: e.target.value })}
          />
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={paying}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-emerald-500 disabled:opacity-60"
            >
              {paying ? 'Recording…' : 'Add Payout'}
            </button>
          </div>
        </div>
      </form>

      {/* Payouts table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Note</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(payouts ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                  No payouts yet.
                </td>
              </tr>
            ) : (
              [...payouts]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((p) => (
                  <tr key={p._id} className="border-t last:border-b">
                    <td className="px-4 py-3">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.note || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deletePayout(p._id)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-500"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Phone */}
      <form
        onSubmit={addPhone}
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <h3 className="text-lg font-semibold">Add Phone</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            required
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Model"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Storage"
            value={form.storage}
            onChange={(e) => setForm({ ...form, storage: e.target.value })}
          />
          <input
            required
            type="number"
            min="0"
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Buy Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="IMEI (optional)"
            value={form.imei}
            onChange={(e) => setForm({ ...form, imei: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? 'Saving…' : '+ Add Phone'}
          </button>
        </div>
      </form>

      {/* Phones table */}
      <PhonesTable
        phones={phones}
        editId={editId}
        editForm={editForm}
        setEditForm={setEditForm}
        sellId={sellId}
        sellPrice={sellPrice}
        setSellPrice={setSellPrice}
        editSaving={editSaving}
        sellSaving={sellSaving}
        busyId={busyId}
        startEdit={startEdit}
        saveEdit={saveEdit}
        cancelEdit={cancelEdit}
        startSell={startSell}
        saveSell={saveSell}
        cancelSell={cancelSell}
        removePhone={removePhone}
      />
    </div>
  );
}

/* --- Components & utils --- */

function PhonesTable(props) {
  const {
    phones,
    editId,
    editForm,
    setEditForm,
    sellId,
    sellPrice,
    setSellPrice,
    editSaving,
    sellSaving,
    busyId,
    startEdit,
    saveEdit,
    cancelEdit,
    startSell,
    saveSell,
    cancelSell,
    removePhone,
  } = props;

  const profit = (p) =>
    typeof p.sellPrice === 'number'
      ? Math.max(0, Number(p.sellPrice) - Number(p.price || 0))
      : 0;
  const investorCut = (p) => profit(p) / 2;

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Model</th>
            <th className="px-4 py-3 font-semibold">Storage</th>
            <th className="px-4 py-3 font-semibold">Buy Price</th>
            <th className="px-4 py-3 font-semibold">IMEI</th>
            <th className="px-4 py-3 font-semibold">Sell Price</th>
            <th className="px-4 py-3 font-semibold">Profit</th>
            <th className="px-4 py-3 font-semibold">Investor Profit (50%)</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Added</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {phones.length === 0 ? (
            <tr>
              <td
                className="px-4 py-6 text-center text-gray-500"
                colSpan={10}
              >
                No phones yet. Add your first phone above.
              </td>
            </tr>
          ) : (
            phones.map((p) => {
              const isEditing = editId === p._id;
              const isSelling = sellId === p._id;
              const profitValue = profit(p);
              const investorShare = investorCut(p);

              return (
                <tr key={p._id} className="border-t last:border-b">
                  {/* Model */}
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {isEditing ? (
                      <input
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    ) : (
                      p.name
                    )}
                  </td>

                  {/* Storage */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                        value={editForm.storage}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, storage: e.target.value }))
                        }
                      />
                    ) : (
                      p.storage
                    )}
                  </td>

                  {/* Buy Price */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        className="no-spinner w-full rounded-xl border border-gray-300 px-2 py-2"
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, price: e.target.value }))
                        }
                      />
                    ) : (
                      formatCurrency(p.price)
                    )}
                  </td>

                  {/* IMEI */}
                  {/* <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                        value={editForm.imei}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, imei: e.target.value }))
                        }
                      />
                    ) : (
                      p.imei || '—'
                    )}
                  </td> */}
                  <td className="px-4 py-3">
                    {p.imei || '—'}
                  </td>
                  {/* Sell Price */}
                  <td className="px-4 py-3">
                    {p.isSold && !isSelling ? (
                      formatCurrency(p.sellPrice)
                    ) : isSelling ? (
                      <input
                        type="number"
                        min="0"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2"
                        placeholder="Sell price"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                      />
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Profit */}
                  <td className="px-4 py-3">
                    {p.isSold ? formatCurrency(profitValue) : '—'}
                  </td>

                  {/* Investor Profit */}
                  <td className="px-4 py-3">
                    {p.isSold ? formatCurrency(investorShare) : '—'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {p.isSold ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Sold
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        Available
                      </span>
                    )}
                  </td>

                  {/* Added */}
                  <td className="px-4 py-3 text-gray-500">
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString()
                      : '—'}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={editSaving}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-500 disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : isSelling ? (
                        <>
                          <button
                            type="button"
                            onClick={saveSell}
                            disabled={sellSaving}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500 disabled:opacity-60"
                          >
                            {sellSaving ? 'Marking…' : 'Mark Sold'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelSell}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            disabled={p.isSold}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
                          >
                            Edit
                          </button>
                          {!p.isSold && (
                            <button
                              type="button"
                              onClick={() => startSell(p)}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500"
                            >
                              Sell
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removePhone(p)}
                            disabled={p.isSold || busyId === p._id}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-500 disabled:opacity-60"
                          >
                            {busyId === p._id ? 'Deleting…' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function sum(arr) {
  return arr.reduce((acc, n) => acc + Number(n || 0), 0);
}
function formatCurrency(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return '—';
  }
}
function extractError(e) {
  try {
    const msg = typeof e === 'string' ? e : e?.message || '';
    const m = msg.match(/\{.*\}/s);
    if (m) return JSON.parse(m[0])?.message || 'Request failed';
    return msg || 'Request failed';
  } catch {
    return 'Request failed';
  }
}
