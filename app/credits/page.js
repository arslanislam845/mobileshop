'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function Credits() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    try {
      setErr('');
      const data = await api('/credits');
      setItems(data);
    } catch (e) {
      setErr(e.message || 'Failed to load credits');
    }
  }

  useEffect(() => { load(); }, []);

  async function addCredit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setErr('');
    try {
      await api('/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      setName('');
      await load();
    } catch (e) {
      setErr(e.message || 'Failed to add credit party');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Credit Parties</h2>
          <p className="text-gray-500 text-sm">
            Manage all credit suppliers and view their details.
          </p>
        </div>
      </div>

      {/* Add Credit Party Form */}
      <form
        onSubmit={addCredit}
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold">Add Credit Party</h3>
        {err && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            required
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter credit party name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-white font-semibold shadow-sm hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? 'Adding…' : '+ Add Credit Party'}
          </button>
        </div>
      </form>

      {/* List of Credit Parties */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-500"
                  colSpan={2}
                >
                  No credit parties yet. Add one above.
                </td>
              </tr>
            ) : (
              items.map((i) => (
                <tr
                  key={i._id}
                  className="border-t last:border-b hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {i.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/credits/${i._id}`}
                      className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View Details →
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
