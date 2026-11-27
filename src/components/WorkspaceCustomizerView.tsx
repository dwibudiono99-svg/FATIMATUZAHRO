import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import {
  AVAILABLE_WIDGETS,
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_MODULE_CONFIGS,
  MODULE_BASE_FIELDS,
} from '../lib/defaults';
import { saveDashboardConfig, saveModuleConfig } from '../lib/firestoreService';
import {
  CustomFieldDef,
  CustomFieldType,
  DashboardConfig,
  DashboardThemeColor,
  ModuleConfigDoc,
  ModuleId,
} from '../types/database';

interface WorkspaceCustomizerViewProps {
  workspaceId: string;
  dashboardConfig: DashboardConfig;
  moduleConfigs: Record<ModuleId, ModuleConfigDoc>;
  initialTab?: 'dashboard' | 'database';
  initialModule?: ModuleId;
  onNotify: (msg: string) => void;
}

const MODULE_TABS: { id: ModuleId; label: string }[] = [
  { id: 'persuratan', label: 'Persuratan' },
  { id: 'aset', label: 'Aset' },
  { id: 'guru', label: 'Guru' },
  { id: 'siswa', label: 'Siswa' },
  { id: 'karyawan', label: 'Karyawan' },
];

export const WorkspaceCustomizerView: React.FC<WorkspaceCustomizerViewProps> = ({
  workspaceId,
  dashboardConfig,
  moduleConfigs,
  initialTab = 'dashboard',
  initialModule = 'persuratan',
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database'>(initialTab);
  const [dashDraft, setDashDraft] = useState<DashboardConfig>(dashboardConfig);
  const [selectedModule, setSelectedModule] = useState<ModuleId>(initialModule);
  const [modDraft, setModDraft] = useState<ModuleConfigDoc>(moduleConfigs[initialModule]);
  const [savingDash, setSavingDash] = useState(false);
  const [savingMod, setSavingMod] = useState(false);

  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomType, setNewCustomType] = useState<CustomFieldType>('text');
  const [newCustomOptions, setNewCustomOptions] = useState('');

  useEffect(() => {
    setDashDraft(dashboardConfig);
  }, [dashboardConfig]);

  useEffect(() => {
    setModDraft(moduleConfigs[selectedModule]);
  }, [selectedModule, moduleConfigs]);

  const toggleWidget = (widgetId: string) => {
    setDashDraft((prev) => {
      const exists = prev.widgetTampil.includes(widgetId);
      return {
        ...prev,
        widgetTampil: exists
          ? prev.widgetTampil.filter((id) => id !== widgetId)
          : [...prev.widgetTampil, widgetId],
      };
    });
  };

  const moveModuleOrder = (index: number, direction: -1 | 1) => {
    const next = [...dashDraft.urutanModul];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setDashDraft({ ...dashDraft, urutanModul: next });
  };

  const handleSaveDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDash(true);
    try {
      await saveDashboardConfig(workspaceId, dashDraft);
      onNotify('Tata letak dan tampilan Dashboard berhasil diperbarui.');
    } finally {
      setSavingDash(false);
    }
  };

  const toggleColumnVisibility = (fieldKey: string) => {
    setModDraft((prev) => {
      const isHidden = prev.hiddenColumns.includes(fieldKey);
      return {
        ...prev,
        hiddenColumns: isHidden
          ? prev.hiddenColumns.filter((k) => k !== fieldKey)
          : [...prev.hiddenColumns, fieldKey],
      };
    });
  };

  const updateColumnLabel = (fieldKey: string, label: string) => {
    setModDraft((prev) => ({
      ...prev,
      columnLabels: {
        ...prev.columnLabels,
        [fieldKey]: label,
      },
    }));
  };

  const addSelectOption = (optionKey: string) => {
    const text = (newOptionInputs[optionKey] || '').trim();
    if (!text) return;
    setModDraft((prev) => {
      const current = prev.selectOptions[optionKey] || [];
      if (current.includes(text)) return prev;
      return {
        ...prev,
        selectOptions: {
          ...prev.selectOptions,
          [optionKey]: [...current, text],
        },
      };
    });
    setNewOptionInputs((prev) => ({ ...prev, [optionKey]: '' }));
  };

  const removeSelectOption = (optionKey: string, optValue: string) => {
    setModDraft((prev) => {
      const current = prev.selectOptions[optionKey] || [];
      if (current.length <= 1) return prev;
      return {
        ...prev,
        selectOptions: {
          ...prev.selectOptions,
          [optionKey]: current.filter((o) => o !== optValue),
        },
      };
    });
  };

  const addCustomField = () => {
    const label = newCustomLabel.trim();
    if (!label) return;
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    if (!key) return;

    const newField: CustomFieldDef = {
      id: `cf-${Date.now()}`,
      key: `${key}_${Math.floor(Math.random() * 100)}`,
      label,
      type: newCustomType,
      required: false,
      showInTable: true,
      ...(newCustomType === 'select'
        ? {
            options: newCustomOptions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {}),
    };

    setModDraft((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), newField],
    }));
    setNewCustomLabel('');
    setNewCustomOptions('');
  };

  const removeCustomField = (id: string) => {
    setModDraft((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((cf) => cf.id !== id),
    }));
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMod(true);
    try {
      await saveModuleConfig(workspaceId, selectedModule, modDraft);
      onNotify(`Struktur database ${modDraft.displayName} berhasil disimpan.`);
    } finally {
      setSavingMod(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan Dashboard &amp; Struktur Database
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ubah tampilan dashboard, susunan modul, nama kolom tabel, opsi pilihan dropdown, serta tambah kolom kustom.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg shrink-0 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tata Letak Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'database'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Struktur &amp; Kolom Database
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <form onSubmit={handleSaveDashboard} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-display text-sm font-bold text-slate-900">
                Identitas &amp; Tampilan Dashboard
              </h2>
              <button
                type="button"
                onClick={() => setDashDraft(DEFAULT_DASHBOARD_CONFIG)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Judul Utama Dashboard
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={dashDraft.judul}
                onChange={(e) => setDashDraft({ ...dashDraft, judul: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Subjudul / Deskripsi Singkat
              </label>
              <textarea
                rows={2}
                maxLength={240}
                value={dashDraft.subjudul}
                onChange={(e) => setDashDraft({ ...dashDraft, subjudul: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Periode / Tahun Ajaran Aktif
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={dashDraft.tahunAjaran}
                onChange={(e) => setDashDraft({ ...dashDraft, tahunAjaran: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Kepadatan Baris Tabel
                </label>
                <select
                  value={dashDraft.kepadatanTabel}
                  onChange={(e) =>
                    setDashDraft({
                      ...dashDraft,
                      kepadatanTabel: e.target.value as DashboardConfig['kepadatanTabel'],
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="nyaman">Nyaman (Standar)</option>
                  <option value="padat">Padat (Banyak Baris)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Warna Aksen Utama
                </label>
                <select
                  value={dashDraft.warnaTema}
                  onChange={(e) =>
                    setDashDraft({
                      ...dashDraft,
                      warnaTema: e.target.value as DashboardThemeColor,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="navy">Biru Instansi (Navy)</option>
                  <option value="slate">Netral Slate</option>
                  <option value="emerald">Hijau Zamrud</option>
                  <option value="amber">Kuning Keemasan</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-900 mb-2.5">
                Urutan Kartu Modul di Dashboard &amp; Sidebar
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {dashDraft.urutanModul.map((modId, idx) => (
                  <div key={modId} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">
                      {idx + 1}. {moduleConfigs[modId]?.displayName || modId}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveModuleOrder(idx, -1)}
                        className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        title="Naikkan urutan"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === dashDraft.urutanModul.length - 1}
                        onClick={() => moveModuleOrder(idx, 1)}
                        className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        title="Turunkan urutan"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h2 className="font-display text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Widget yang Ditampilkan di Dashboard
            </h2>

            <div className="divide-y divide-slate-100">
              {AVAILABLE_WIDGETS.map((w) => {
                const checked = dashDraft.widgetTampil.includes(w.id);
                return (
                  <label
                    key={w.id}
                    className="py-3 flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{w.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{w.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleWidget(w.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </label>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={savingDash}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingDash ? 'Menyimpan...' : 'Simpan Pengaturan Dashboard'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Module Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {MODULE_TABS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModule(m.id)}
                className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  selectedModule === m.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {moduleConfigs[m.id]?.displayName || m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSaveModule} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Column Labels & Visibility */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Nama Modul &amp; Kolom Bawaan
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setModDraft({
                      ...DEFAULT_MODULE_CONFIGS[selectedModule],
                      ownerId: modDraft.ownerId,
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Modul</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Tampilan Modul (Sidebar &amp; Judul)
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={modDraft.displayName}
                  onChange={(e) => setModDraft({ ...modDraft, displayName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Ubah Nama Kolom &amp; Tampilkan di Tabel
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {MODULE_BASE_FIELDS[selectedModule].map((field) => {
                    const isVisible = !modDraft.hiddenColumns.includes(field.key);
                    const customLabel = modDraft.columnLabels?.[field.key] ?? '';
                    return (
                      <div key={field.key} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={customLabel}
                            placeholder={field.defaultLabel}
                            maxLength={60}
                            onChange={(e) => updateColumnLabel(field.key, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                        </div>
                        {field.type !== 'textarea' && (
                          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => toggleColumnVisibility(field.key)}
                              className="h-3.5 w-3.5 rounded border-slate-300"
                            />
                            <span>Tampil</span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dropdown Options & Custom Fields */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Ubah Daftar Pilihan Dropdown
                </h2>

                {Object.entries(modDraft.selectOptions || {}).map(([optKey, options]) => (
                  <div key={optKey} className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 capitalize">
                      Opsi {optKey.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(options as string[]).map((opt) => (
                        <span
                          key={opt}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-100 border border-slate-200 rounded-md text-slate-800"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => removeSelectOption(optKey, opt)}
                            className="text-slate-400 hover:text-red-700 cursor-pointer"
                            title="Hapus opsi"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newOptionInputs[optKey] || ''}
                        onChange={(e) =>
                          setNewOptionInputs((prev) => ({ ...prev, [optKey]: e.target.value }))
                        }
                        placeholder={`Tambah opsi ${optKey}...`}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => addSelectOption(optKey)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Kolom Tambahan Kustom (Custom Fields)
                </h2>

                {(modDraft.customFields || []).length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {modDraft.customFields.map((cf) => (
                      <div key={cf.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-slate-900">{cf.label}</p>
                          <p className="text-slate-500">
                            Tipe: {cf.type} {cf.options?.length ? `· (${cf.options.join(', ')})` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCustomField(cf.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 cursor-pointer"
                          title="Hapus kolom kustom"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Belum ada kolom tambahan. Tambahkan kolom baru di bawah sesuai kebutuhan sekolah.
                  </p>
                )}

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <p className="text-xs font-semibold text-slate-800">Tambah Kolom Baru</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={newCustomLabel}
                      onChange={(e) => setNewCustomLabel(e.target.value)}
                      placeholder="Nama kolom (mis. Golongan Darah)"
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <select
                      value={newCustomType}
                      onChange={(e) => setNewCustomType(e.target.value as CustomFieldType)}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="text">Teks</option>
                      <option value="number">Angka</option>
                      <option value="date">Tanggal</option>
                      <option value="select">Pilihan Dropdown</option>
                    </select>
                  </div>
                  {newCustomType === 'select' && (
                    <input
                      type="text"
                      value={newCustomOptions}
                      onChange={(e) => setNewCustomOptions(e.target.value)}
                      placeholder="Pilihan dipisah koma (mis. A, B, AB, O)"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  )}
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambahkan ke Struktur</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingMod}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingMod ? 'Menyimpan...' : 'Simpan Struktur Database'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
