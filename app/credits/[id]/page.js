'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function CreditDetail({ params }) {
  const { id } = params;

  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  // add phone form
  const [form, setForm] = useState({ name: '', storage: '', price: '' });
  const [saving, setSaving] = useState(false);

  // inline edit
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', storage: '', price: '' });
  const [editSaving, setEditSaving] = useState(false);

  // inline sell
  const [sellId, setSellId] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellSaving, setSellSaving] = useState(false);

  // delete busy
  const [busyId, setBusyId] = useState(null);

  // payment form
  const [paying, setPaying] = useState(false);
  const [payment, setPayment] = useState({ amount: '', paidAt: '', note: '' });

  async function load() {
    try {
      setErr('');
      const res = await api(`/credits/${id}`);
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
      await api(`/credits/${id}/phones`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          storage: form.storage.trim(),
          price: Number(form.price),
        }),
      });
      setForm({ name: '', storage: '', price: '' });
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setSaving(false);
    }
  }

  // ⚠️ No hooks below this line
  const party = data?.creditParty || { name: '' };
  const phones = data?.phones ?? [];
  const payments = data?.payments ?? (data?.creditParty?.payments ?? []);
  const summary = data?.summary ?? data?.totals ?? null;

  // stats
  const allCount = phones.length;
  const allTotal = summary ? (summary.phonesTotal ?? summary.totalPhones ?? 0) : sum(phones.map(p => p.price));
  const unsold = phones.filter(p => !p.isSold);
  const availCount = unsold.length;
  const availTotal = sum(unsold.map(p => p.price));
  const paymentsTotal = summary ? (summary.paymentsTotal ?? summary.totalPaid ?? 0) : sum(payments.map(p => p.amount));
  const pendingCash = summary ? (summary.pending ?? Math.max(0, allTotal - paymentsTotal)) : Math.max(0, allTotal - paymentsTotal);

  // edit
  function startEdit(p) {
    if (p.isSold) return;
    setSellId(null);
    setEditId(p._id);
    setEditForm({ name: p.name, storage: p.storage, price: String(p.price ?? '') });
  }
  async function saveEdit() {
    if (!editId) return;
    setEditSaving(true);
    try {
      await api(`/phones/${editId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          storage: editForm.storage.trim(),
          price: Number(editForm.price),
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
  function cancelEdit() { setEditId(null); }

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
  function cancelSell() { setSellId(null); setSellPrice(''); }

  // payments
  async function addPayment(e) {
    e.preventDefault();
    const amt = Number(payment.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr('Amount must be > 0');
      return;
    }
    setPaying(true);
    setErr('');
    try {
      await api(`/credits/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          // backend may use either `paidAt` or `date`; send both if present for compatibility
          paidAt: payment.paidAt || undefined,
          date: payment.paidAt || undefined,
          note: payment.note?.trim() || undefined,
        }),
      });
      setPayment({ amount: '', paidAt: '', note: '' });
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setPaying(false);
    }
  }

  async function deletePayment(paymentId) {
    if (!confirm('Delete this payment?')) return;
    try {
      await api(`/credits/${id}/payments/${paymentId}`, { method: 'DELETE' });
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
          <h2 className="text-2xl font-bold">Credit Party</h2>
          <p className="text-sm text-gray-500">
            Manage phones & payments for <span className="font-medium text-gray-700">{party.name}</span>.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat title="Pending Cash" value={formatCurrency(pendingCash)} />
        <Stat title="All Phones" value={allCount} />
        <Stat title="Phones Value" value={formatCurrency(allTotal)} />
        <Stat title="Paid" value={formatCurrency(paymentsTotal)} />
        
        <Stat title="Available (Unsold)" value={`${availCount} · ${formatCurrency(availTotal)}`} />
      </div>

      {err && <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

    

      {/* Payments */}
      <form onSubmit={addPayment} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Record Payment</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input type="number" min="0" step="1" required
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Amount (e.g. 500)"
            value={payment.amount}
            onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
          />
          <input type="date"
            className="rounded-xl border border-gray-300 px-3 py-2"
            value={payment.paidAt}
            onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })}
          />
          <input
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Note (optional)"
            value={payment.note}
            onChange={(e) => setPayment({ ...payment, note: e.target.value })}
          />
          <div className="flex items-center justify-end">
            <button type="submit" disabled={paying}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-emerald-500 disabled:opacity-60">
              {paying ? 'Recording…' : 'Add Payment'}
            </button>
          </div>
        </div>
      </form>

      {/* Payments list */}
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
            {(payments ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>No payments yet.</td>
              </tr>
            ) : (
              [...payments]
                .sort((a, b) => new Date(b.date ?? b.paidAt) - new Date(a.date ?? a.paidAt))
                .map(pay => (
                  <tr key={pay._id} className="border-t last:border-b">
                    <td className="px-4 py-3">{formatDate(pay.date || pay.paidAt)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(pay.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{pay.note || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deletePayment(pay._id)}
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
      <form onSubmit={addPhone} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Add Phone</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="rounded-xl border border-gray-300 px-3 py-2" placeholder="Model" required
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-xl border border-gray-300 px-3 py-2" placeholder="Storage" required
            value={form.storage} onChange={e => setForm({ ...form, storage: e.target.value })} />
          <input type="number" min="0" className="rounded-xl border border-gray-300 px-3 py-2" placeholder="Buy Price" required
            value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
        </div>
        <div className="flex items-center justify-end">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-indigo-500 disabled:opacity-60">
            {saving ? 'Saving…' : '+ Add Phone'}
          </button>
        </div>
      </form>
      {/* Phones table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Model</th>
              <th className="px-4 py-3 font-semibold">Storage</th>
              <th className="px-4 py-3 font-semibold">Buy Price</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Added</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {phones.length === 0 ? (
              <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={6}>No phones yet.</td></tr>
            ) : phones.map(p => {
                const isEditing = editId === p._id;
                const isSelling = sellId === p._id;
                return (
                  <tr key={p._id} className="border-t last:border-b">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {isEditing
                        ? <input className="w-full rounded-xl border border-gray-300 px-3 py-2"
                            value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                        : p.name}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing
                        ? <input className="w-full rounded-xl border border-gray-300 px-3 py-2"
                            value={editForm.storage} onChange={e => setEditForm({ ...editForm, storage: e.target.value })} />
                        : p.storage}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing
                        ? <input type="number" min="0" className="w-full rounded-xl border border-gray-300 px-3 py-2"
                            value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
                        : formatCurrency(p.price)}
                    </td>
                    <td className="px-4 py-3">
                      {p.isSold
                        ? <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Sold{typeof p.sellPrice === 'number' ? ` · ${formatCurrency(p.sellPrice)}` : ''}
                          </span>
                        : <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            Available
                          </span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button type="button" onClick={saveEdit} disabled={editSaving}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-500 disabled:opacity-60">Save</button>
                            <button type="button" onClick={cancelEdit}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Cancel</button>
                          </>
                        ) : isSelling ? (
                          <>
                            <input type="number" min="0" className="w-28 rounded-xl border border-gray-300 px-3 py-1.5"
                              placeholder="Sell price" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
                            <button type="button" onClick={saveSell} disabled={sellSaving}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500 disabled:opacity-60">
                              {sellSaving ? 'Marking…' : 'Mark Sold'}
                            </button>
                            <button type="button" onClick={cancelSell}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(p)} disabled={p.isSold}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60">Edit</button>
                            <button type="button" onClick={() => startSell(p)} disabled={p.isSold}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500 disabled:opacity-60">Sell</button>
                            <button type="button" onClick={() => removePhone(p)} disabled={p.isSold || busyId === p._id}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-500 disabled:opacity-60">
                              {busyId === p._id ? 'Deleting…' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
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

function sum(arr) { return arr.reduce((acc, n) => acc + Number(n || 0), 0); }
function formatCurrency(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function formatDate(d) {
  try { return new Date(d).toLocaleDateString(); } catch { return '—'; }
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
