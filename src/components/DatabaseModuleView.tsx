import React, { useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  Eye,
  FileDown,
  Plus,
  Printer,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { MODULE_BASE_FIELDS } from '../lib/defaults';
import { exportRecordsToCSV, exportRecordsToPDF } from '../lib/exportArchive';
import {
  createModuleRecord,
  deleteModuleRecord,
  reseedModuleSampleData,
  updateModuleRecord,
} from '../lib/firestoreService';
import {
  AnyModuleRecord,
  DashboardConfig,
  KopSuratConfig,
  LetterRecord,
  ModuleConfigDoc,
  ModuleId,
} from '../types/database';
import { KopSuratPreview } from './KopSuratPreview';

interface DatabaseModuleViewProps {
  workspaceId: string;
  moduleId: ModuleId;
  moduleConfig: ModuleConfigDoc;
  dashboardConfig: DashboardConfig;
  kopSurat: KopSuratConfig;
  records: AnyModuleRecord[];
  loading: boolean;
  onOpenCustomizer: (moduleId: ModuleId) => void;
  onOpenImport?: () => void;
  onNotify: (msg: string) => void;
}

const formatRupiah = (val: unknown): string => {
  const num = Number(val ?? 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
};

const formatDateIndonesian = (iso: string): string => {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const DatabaseModuleView: React.FC<DatabaseModuleViewProps> = ({
  workspaceId,
  moduleId,
  moduleConfig,
  dashboardConfig,
  kopSurat,
  records,
  loading,
  onOpenCustomizer,
  onOpenImport,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState<string>('semua');
  const [sortField, setSortField] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const [editingRecord, setEditingRecord] = useState<AnyModuleRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<Record<string, unknown>>({});
  const [customFormState, setCustomFormState] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [printLetter, setPrintLetter] = useState<LetterRecord | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<AnyModuleRecord | null>(null);
  const [reseeding, setReseeding] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const baseFields = MODULE_BASE_FIELDS[moduleId];
  const hiddenSet = useMemo(
    () => new Set(moduleConfig.hiddenColumns || []),
    [moduleConfig.hiddenColumns],
  );

  const getFieldLabel = (key: string, defaultLabel: string): string =>
    moduleConfig.columnLabels?.[key]?.trim() || defaultLabel;

  const getFieldOptions = (key: string, fixedOptions?: string[], optionsKey?: string): string[] => {
    if (fixedOptions) return fixedOptions;
    if (optionsKey && moduleConfig.selectOptions?.[optionsKey]) {
      return moduleConfig.selectOptions[optionsKey];
    }
    return [];
  };

  const visibleBaseColumns = useMemo(
    () => baseFields.filter((f) => !hiddenSet.has(f.key) && f.type !== 'textarea'),
    [baseFields, hiddenSet],
  );

  const visibleCustomColumns = useMemo(
    () => (moduleConfig.customFields || []).filter((cf) => cf.showInTable !== false),
    [moduleConfig.customFields],
  );

  const filterOptions = useMemo(() => {
    if (moduleId === 'persuratan') return ['semua', 'Surat Masuk', 'Surat Keluar', 'Diarsipkan'];
    if (moduleId === 'aset') return ['semua', 'Baik', 'Rusak Ringan', 'Rusak Berat'];
    if (moduleId === 'guru') return ['semua', 'Aktif', 'Cuti', 'Mutasi'];
    if (moduleId === 'siswa') return ['semua', 'Aktif', 'Lulus', 'Pindah'];
    return ['semua', 'Aktif', 'Cuti', 'Resign'];
  }, [moduleId]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = records.filter((rec) => {
      if (filterSegment !== 'semua') {
        if (moduleId === 'persuratan') {
          const l = rec as LetterRecord;
          if (filterSegment === 'Diarsipkan' && l.status !== 'Diarsipkan') return false;
          if (
            (filterSegment === 'Surat Masuk' || filterSegment === 'Surat Keluar') &&
            l.jenis !== filterSegment
          ) {
            return false;
          }
        } else if (moduleId === 'aset') {
          if ((rec as { kondisi?: string }).kondisi !== filterSegment) return false;
        } else {
          if ((rec as { status?: string }).status !== filterSegment) return false;
        }
      }

      if (!q) return true;
      const flatValues = Object.values(rec)
        .map((v) => (typeof v === 'object' && v !== null ? Object.values(v).join(' ') : String(v ?? '')))
        .join(' ')
        .toLowerCase();
      return flatValues.includes(q);
    });

    if (sortField) {
      list = [...list].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sortField] ?? '';
        const bv = (b as unknown as Record<string, unknown>)[sortField] ?? '';
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortAsc ? av - bv : bv - av;
        }
        return sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }

    return list;
  }, [records, filterSegment, searchQuery, sortField, sortAsc, moduleId]);

  const openAddModal = () => {
    setEditingRecord(null);
    setFormError(null);
    const initial: Record<string, unknown> = {};
    baseFields.forEach((f) => {
      if (f.type === 'select') {
        const opts = getFieldOptions(f.key, f.fixedOptions, f.optionsKey);
        initial[f.key] = opts[0] || '';
      } else if (f.type === 'number') {
        initial[f.key] = 0;
      } else if (f.type === 'date') {
        initial[f.key] = new Date().toISOString().slice(0, 10);
      } else {
        initial[f.key] = '';
      }
    });
    if (moduleId === 'persuratan') {
      initial.penandatangan = kopSurat.namaKepala || '';
    }
    const initCustom: Record<string, string | number> = {};
    (moduleConfig.customFields || []).forEach((cf) => {
      initCustom[cf.key] = cf.type === 'select' ? cf.options?.[0] || '' : '';
    });
    setFormState(initial);
    setCustomFormState(initCustom);
    setIsFormOpen(true);
  };

  const openEditModal = (rec: AnyModuleRecord) => {
    setEditingRecord(rec);
    setFormError(null);
    const initial: Record<string, unknown> = {};
    baseFields.forEach((f) => {
      initial[f.key] = (rec as unknown as Record<string, unknown>)[f.key] ?? '';
    });
    const initCustom: Record<string, string | number> = {
      ...(rec.customValues || {}),
    };
    setFormState(initial);
    setCustomFormState(initCustom);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    for (const f of baseFields) {
      if (f.required) {
        const val = formState[f.key];
        if (f.type === 'number') {
          if (val === '' || val === null || val === undefined || Number(val) < 0) {
            setFormError(`${getFieldLabel(f.key, f.defaultLabel)} wajib diisi dengan angka valid.`);
            return;
          }
        } else if (!String(val ?? '').trim()) {
          setFormError(`${getFieldLabel(f.key, f.defaultLabel)} wajib diisi.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...formState,
        customValues: customFormState,
      };
      if (editingRecord) {
        const prevStatus = (editingRecord as { status?: string }).status;
        await updateModuleRecord(workspaceId, moduleId, editingRecord.id, payload, prevStatus);
        onNotify('Perubahan data berhasil disimpan.');
      } else {
        await createModuleRecord(workspaceId, moduleId, payload);
        onNotify('Data baru berhasil ditambahkan ke database.');
      }
      setIsFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteRecord) return;
    try {
      await deleteModuleRecord(workspaceId, moduleId, confirmDeleteRecord.id);
      onNotify('Data berhasil dihapus.');
    } finally {
      setConfirmDeleteRecord(null);
    }
  };

  const handleExportCSV = () => {
    exportRecordsToCSV({
      moduleId,
      moduleDisplayName: moduleConfig.displayName,
      records: filteredRecords,
      baseColumns: visibleBaseColumns,
      customColumns: visibleCustomColumns,
      columnLabels: moduleConfig.columnLabels || {},
    });
    onNotify(`Arsip CSV ${moduleConfig.displayName} berhasil diunduh.`);
  };

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      await exportRecordsToPDF({
        moduleId,
        moduleDisplayName: moduleConfig.displayName,
        records: filteredRecords,
        baseColumns: visibleBaseColumns,
        customColumns: visibleCustomColumns,
        columnLabels: moduleConfig.columnLabels || {},
        kopSurat,
        filterLabel: filterSegment,
      });
      onNotify(`Arsip PDF ${moduleConfig.displayName} berhasil diunduh.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal membuat file PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleReseed = async () => {
    setReseeding(true);
    try {
      await reseedModuleSampleData(workspaceId, moduleId);
      onNotify('Data contoh modul berhasil dimuat ulang.');
    } finally {
      setReseeding(false);
    }
  };

  const rowPadClass = dashboardConfig.kepadatanTabel === 'padat' ? 'py-2' : 'py-3';

  const renderCellValue = (rec: AnyModuleRecord, key: string, isNumeric?: boolean, isMono?: boolean) => {
    const val = (rec as unknown as Record<string, unknown>)[key];
    if (key === 'nilaiPerolehan') {
      return <span className="font-mono tabular-nums font-medium text-slate-900">{formatRupiah(val)}</span>;
    }
    if (key === 'status' || key === 'kondisi') {
      const str = String(val ?? '-');
      const colorClass =
        str === 'Aktif' || str === 'Baik' || str === 'Terkirim' || str === 'Diterima'
          ? 'text-emerald-700 font-medium'
          : str === 'Diproses' || str === 'Cuti' || str === 'Rusak Ringan'
            ? 'text-amber-700 font-medium'
            : str === 'Rusak Berat' || str === 'Resign' || str === 'Non-Aktif'
              ? 'text-red-700 font-medium'
              : 'text-slate-600 font-medium';
      return <span className={colorClass}>{str}</span>;
    }
    if (isNumeric || isMono) {
      return (
        <span className="font-mono tabular-nums text-slate-800">
          {val !== undefined && val !== '' ? String(val) : '-'}
        </span>
      );
    }
    return <span className="text-slate-800">{val !== undefined && val !== '' ? String(val) : '-'}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            {moduleConfig.displayName}
          </h1>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {filteredRecords.length} dari {records.length} entri · Kolom &amp; pilihan dapat diubah sewaktu-waktu
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenCustomizer(moduleId)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Ubah Kolom &amp; Field</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={filteredRecords.length === 0 || exportingPdf}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{exportingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
          </button>
          {onOpenImport && (
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilterSegment(opt)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filterSegment === opt
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt === 'semua' ? 'Semua' : opt}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari di ${moduleConfig.displayName}...`}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <p className="text-sm font-medium text-slate-700">
              {records.length === 0
                ? `Belum ada data pada ${moduleConfig.displayName}.`
                : 'Tidak ada data yang cocok dengan filter atau kata kunci pencarian.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Entri Pertama</span>
              </button>
              {records.length === 0 && (
                <button
                  type="button"
                  onClick={handleReseed}
                  disabled={reseeding}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{reseeding ? 'Memuat...' : 'Isi Data Contoh'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3 w-12 text-center tabular-nums">No</th>
                  {visibleBaseColumns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => {
                        if (sortField === col.key) setSortAsc(!sortAsc);
                        else {
                          setSortField(col.key);
                          setSortAsc(true);
                        }
                      }}
                      className={`px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-900 select-none ${
                        col.isNumeric ? 'text-right' : ''
                      }`}
                    >
                      {getFieldLabel(col.key, col.defaultLabel)}
                      {sortField === col.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                  {visibleCustomColumns.map((cf) => (
                    <th key={cf.id} className="px-4 py-3 whitespace-nowrap">
                      {cf.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.map((rec, index) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className={`px-4 ${rowPadClass} text-center font-mono tabular-nums text-slate-500`}>
                      {index + 1}
                    </td>
                    {visibleBaseColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 ${rowPadClass} max-w-[260px] truncate ${
                          col.isNumeric ? 'text-right' : ''
                        }`}
                        title={String((rec as unknown as Record<string, unknown>)[col.key] ?? '')}
                      >
                        {renderCellValue(rec, col.key, col.isNumeric, col.isMono)}
                      </td>
                    ))}
                    {visibleCustomColumns.map((cf) => (
                      <td key={cf.id} className={`px-4 ${rowPadClass} max-w-[200px] truncate text-slate-700`}>
                        {rec.customValues?.[cf.key] !== undefined && rec.customValues?.[cf.key] !== ''
                          ? String(rec.customValues[cf.key])
                          : '-'}
                      </td>
                    ))}
                    <td className={`px-4 ${rowPadClass} text-right whitespace-nowrap`}>
                      <div className="inline-flex items-center gap-1">
                        {moduleId === 'persuratan' && (
                          <button
                            type="button"
                            onClick={() => setPrintLetter(rec as LetterRecord)}
                            title="Pratinjau & Cetak dengan Kop Surat"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(rec)}
                          title="Ubah Data"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRecord(rec)}
                          title="Hapus Data"
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-bold text-slate-900">
                {editingRecord ? `Ubah Data · ${moduleConfig.displayName}` : `Tambah Data · ${moduleConfig.displayName}`}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {formError}
                </div>
              )}

              {moduleId === 'persuratan' &&
                editingRecord &&
                (editingRecord as LetterRecord).status === 'Diarsipkan' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    Surat berstatus Diarsipkan terkunci. Ubah status ke Diproses terlebih dahulu jika ingin menyunting isi surat.
                  </div>
                )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {baseFields.map((field) => {
                  const label = getFieldLabel(field.key, field.defaultLabel);
                  const val = formState[field.key] ?? '';
                  const spanFull = field.type === 'textarea' || field.key === 'perihal' || field.key === 'alamat';
                  const options = getFieldOptions(field.key, field.fixedOptions, field.optionsKey);

                  return (
                    <div key={field.key} className={spanFull ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        {label}
                        {field.required && <span className="text-red-600 ml-0.5">*</span>}
                      </label>

                      {field.type === 'select' ? (
                        <select
                          value={String(val)}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        >
                          {options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={4}
                          value={String(val)}
                          maxLength={field.maxLength}
                          placeholder={field.placeholder}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          min={field.type === 'number' ? 0 : undefined}
                          value={String(val)}
                          maxLength={field.type === 'number' ? undefined : field.maxLength}
                          placeholder={field.placeholder}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              [field.key]:
                                field.type === 'number' ? Number(e.target.value) : e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Custom User-Defined Fields */}
                {(moduleConfig.customFields || []).map((cf) => (
                  <div key={cf.id}>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {cf.label}
                      {cf.required && <span className="text-red-600 ml-0.5">*</span>}
                    </label>
                    {cf.type === 'select' ? (
                      <select
                        value={String(customFormState[cf.key] ?? '')}
                        onChange={(e) =>
                          setCustomFormState((prev) => ({ ...prev, [cf.key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="">- Pilih -</option>
                        {(cf.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                        value={String(customFormState[cf.key] ?? '')}
                        onChange={(e) =>
                          setCustomFormState((prev) => ({
                            ...prev,
                            [cf.key]: cf.type === 'number' ? Number(e.target.value) : e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Letter Print Preview Modal with Active Kop Surat */}
      {printLetter && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden print-only-sheet">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 no-print">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Pratinjau Dokumen Resmi
                </h2>
                <p className="text-xs text-slate-500">
                  Menggunakan Kop Surat aktif dari pengaturan
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLetter(null)}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-8 md:p-12 overflow-y-auto bg-white text-slate-900 space-y-6">
              <KopSuratPreview kop={kopSurat} />

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs leading-relaxed pt-2">
                <table className="text-left">
                  <tbody>
                    <tr>
                      <td className="pr-4 py-0.5 text-slate-600">Nomor</td>
                      <td className="pr-2">:</td>
                      <td className="font-mono font-medium">{printLetter.nomorSurat}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 text-slate-600">Sifat</td>
                      <td className="pr-2">:</td>
                      <td>{printLetter.sifat}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 text-slate-600">Lampiran</td>
                      <td className="pr-2">:</td>
                      <td>-</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 text-slate-600">Hal</td>
                      <td className="pr-2">:</td>
                      <td className="font-semibold">{printLetter.perihal}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-xs text-slate-700 shrink-0">
                  {kopSurat.kotaPenetapan || 'Semarang'}, {formatDateIndonesian(printLetter.tanggalSurat)}
                </div>
              </div>

              <div className="text-xs leading-relaxed pt-2">
                <p>Kepada Yth.</p>
                <p className="font-semibold">{printLetter.pihakTerkait}</p>
                <p>di Tempat</p>
              </div>

              <div className="text-xs leading-7 whitespace-pre-line text-slate-800 pt-2">
                {printLetter.isiRingkas || '(Isi surat belum dilengkapi)'}
              </div>

              <div className="pt-8 flex justify-end">
                <div className="w-64 text-xs text-left space-y-16">
                  <div>
                    <p>{kopSurat.jabatanKepala || 'Kepala Sekolah'},</p>
                  </div>
                  <div>
                    <p className="font-semibold underline underline-offset-4">
                      {printLetter.penandatangan || kopSurat.namaKepala}
                    </p>
                    {kopSurat.nipKepala && (
                      <p className="font-mono text-[11px] text-slate-600 mt-0.5">
                        NIP. {kopSurat.nipKepala}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">Hapus Data Permanen?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan menghapus entri terpilih dari database cloud secara permanen dan tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 cursor-pointer"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
