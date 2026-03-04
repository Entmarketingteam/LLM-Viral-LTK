'use client';

import { useState } from 'react';

type Tab = 'proposal' | 'outreach' | 'audit' | 'score' | 'pitch-deck';
type OutputFormat = 'html' | 'json';

interface ProspectForm {
  name: string;
  username: string;
  category: string;
  instagramFollowers: string;
  ltkUrl: string;
  ltkActive: boolean;
  ltkBoardCount: string;
  amazonStorefront: boolean;
  contentStyle: string;
  painPoints: string;
  brandPartners: string;
  email: string;
  notes: string;
}

const DEFAULT_FORM: ProspectForm = {
  name: '',
  username: '',
  category: 'Fashion',
  instagramFollowers: '',
  ltkUrl: '',
  ltkActive: false,
  ltkBoardCount: '',
  amazonStorefront: false,
  contentStyle: '',
  painPoints: '',
  brandPartners: '',
  email: '',
  notes: '',
};

const CATEGORIES = [
  'Fashion', 'Beauty', 'Home & Interior', 'Lifestyle', 'Fitness',
  'Family', 'Food', 'Travel', 'Fashion & Beauty', 'Tech',
];

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: 'proposal', label: 'Proposal', description: 'Premium HTML client proposal' },
  { id: 'outreach', label: 'Outreach', description: 'DM + Email + LinkedIn messages' },
  { id: 'audit', label: 'Audit', description: 'Free monetization audit (lead magnet)' },
  { id: 'score', label: 'Score Card', description: 'Creator signal scoring & research' },
  { id: 'pitch-deck', label: 'Pitch Deck', description: 'Brand partnership pitch deck' },
];

export default function LeadGenPage() {
  const [activeTab, setActiveTab] = useState<Tab>('proposal');
  const [form, setForm] = useState<ProspectForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ html?: string; json?: Record<string, unknown> } | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('html');
  const [error, setError] = useState<string | null>(null);

  const updateForm = (field: keyof ProspectForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildProspectData = () => {
    const platforms: Array<{ platform: string; url?: string; followers?: number }> = [];
    if (form.instagramFollowers || form.username) {
      platforms.push({
        platform: 'instagram',
        followers: parseInt(form.instagramFollowers, 10) || undefined,
      });
    }
    if (form.ltkUrl || form.ltkActive) {
      platforms.push({ platform: 'ltk', url: form.ltkUrl || undefined });
    }

    return {
      name: form.name,
      username: form.username || undefined,
      category: form.category,
      platforms,
      ltkStatus: {
        active: form.ltkActive,
        boardCount: parseInt(form.ltkBoardCount, 10) || undefined,
      },
      amazonStatus: {
        hasStorefront: form.amazonStorefront,
        hasAssociates: false,
      },
      contentStyleStrengths: form.contentStyle ? form.contentStyle.split(',').map((s) => s.trim()) : undefined,
      painPoints: form.painPoints ? form.painPoints.split(',').map((s) => s.trim()) : undefined,
      currentBrandPartners: form.brandPartners ? form.brandPartners.split(',').map((s) => s.trim()) : undefined,
      email: form.email || undefined,
      notes: form.notes || undefined,
    };
  };

  const handleGenerate = async () => {
    if (!form.name || !form.category) {
      setError('Name and category are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const prospect = buildProspectData();
      const endpoint = `/api/v1/lead-gen/${activeTab}`;
      const body: Record<string, unknown> = { prospect };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed: ${res.status}`);
      }

      const data = await res.json();
      setResult({
        html: data.html,
        json: data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = () => {
    setForm({
      name: 'Brittany Sjogren',
      username: 'loverlygrey',
      category: 'Fashion',
      instagramFollowers: '180000',
      ltkUrl: 'https://www.shopltk.com/explore/loverlygrey',
      ltkActive: true,
      ltkBoardCount: '25',
      amazonStorefront: false,
      contentStyle: 'outfit styling, try-ons, seasonal capsules',
      painPoints: 'overwhelmed with linking, not structured for scale',
      brandPartners: 'Nordstrom, Abercrombie',
      email: '',
      notes: 'High priority creator in fashion space',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Lead Gen Automation</h1>
          <p className="text-gray-400 text-sm">
            Generate proposals, outreach, audits, score cards, and pitch decks for creator prospects.
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Creator Data</h2>
                <button
                  onClick={handleLoadDemo}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Load Demo
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="Creator name"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => updateForm('username', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="@handle"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => updateForm('category', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Instagram Followers</label>
                  <input
                    type="number"
                    value={form.instagramFollowers}
                    onChange={(e) => updateForm('instagramFollowers', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 150000"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">LTK URL</label>
                  <input
                    type="text"
                    value={form.ltkUrl}
                    onChange={(e) => updateForm('ltkUrl', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://www.shopltk.com/explore/..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.ltkActive}
                      onChange={(e) => updateForm('ltkActive', e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700"
                    />
                    <span className="text-gray-300">LTK Active</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.amazonStorefront}
                      onChange={(e) => updateForm('amazonStorefront', e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700"
                    />
                    <span className="text-gray-300">Amazon Storefront</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">LTK Board Count (monthly)</label>
                  <input
                    type="number"
                    value={form.ltkBoardCount}
                    onChange={(e) => updateForm('ltkBoardCount', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 20"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Content Strengths (comma-separated)</label>
                  <input
                    type="text"
                    value={form.contentStyle}
                    onChange={(e) => updateForm('contentStyle', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="outfit styling, try-ons, reels"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Pain Points (comma-separated)</label>
                  <input
                    type="text"
                    value={form.painPoints}
                    onChange={(e) => updateForm('painPoints', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="overwhelmed with linking, low conversion"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Current Brand Partners (comma-separated)</label>
                  <input
                    type="text"
                    value={form.brandPartners}
                    onChange={(e) => updateForm('brandPartners', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="Nordstrom, Sephora"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="creator@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateForm('notes', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 h-20 resize-none"
                    placeholder="Additional notes..."
                  />
                </div>

                {error && (
                  <div className="bg-red-950 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 rounded-lg transition-colors text-sm"
                >
                  {loading ? 'Generating...' : `Generate ${TABS.find((t) => t.id === activeTab)?.label}`}
                </button>
              </div>
            </div>
          </div>

          {/* Output Panel */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">
                  {TABS.find((t) => t.id === activeTab)?.label} Output
                </h2>
                {result && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOutputFormat('html')}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        outputFormat === 'html' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setOutputFormat('json')}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        outputFormat === 'json' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      JSON
                    </button>
                    {result.html && (
                      <button
                        onClick={() => {
                          const blob = new Blob([result.html || ''], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${form.name || 'output'}-${activeTab}.html`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1 rounded text-xs font-medium bg-gray-800 text-gray-400 hover:text-white"
                      >
                        Download HTML
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="min-h-[600px]">
                {!result && !loading && (
                  <div className="flex items-center justify-center h-[600px] text-gray-500 text-sm">
                    Fill in creator data and click Generate to see the output.
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Generating {activeTab}...</p>
                    </div>
                  </div>
                )}

                {result && outputFormat === 'html' && result.html && (
                  <iframe
                    srcDoc={result.html}
                    className="w-full h-[800px] border-0"
                    title="Generated Output"
                    sandbox="allow-same-origin"
                  />
                )}

                {result && outputFormat === 'json' && (
                  <pre className="p-6 text-xs text-gray-300 overflow-auto max-h-[800px] whitespace-pre-wrap">
                    {JSON.stringify(result.json, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
