import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { MODULE_BASE_FIELDS } from '../lib/defaults';
import { batchCreateModuleRecords } from '../lib/firestoreService';
import { ModuleConfigDoc, ModuleId } from '../types/database';

type ImportTargetModule = 'siswa' | 'guru' | 'karyawan';

interface ImportDataViewProps {
  workspaceId: string;
  initialTarget?: ImportTargetModule;
  moduleConfigs: Record<ModuleId, ModuleConfigDoc>;
  onNavigateToModule: (modId: ModuleId) => void;
  onNotify: (msg: string) => void;
}

interface ParsedImportRow {
  rowNumber: number;
  payload: Record<string, unknown>;
  summaryName: string;
  summaryCode: string;
  errors: string[];
}

const IMPORT_TARGETS: { id: ImportTargetModule; label: string; desc: string }[] = [
  { id: 'siswa', label: 'Data Siswa', desc: 'NISN, NIS, Nama, L/P, Kelas, Angkatan, Wali' },
  { id: 'guru', label: 'Data Guru', desc: 'NIP, NUPTK, Nama, L/P, Mata Pelajaran, Status' },
  { id: 'karyawan', label: 'Data Karyawan', desc: 'ID Pegawai, Nama, L/P, Divisi, Jabatan, Status' },
];

function detectDelimiter(headerLine: string): string {
  const counts = {
    '\t': (headerLine.match(/\t/g) || []).length,
    ';': (headerLine.match(/;/g) || []).length,
    ',': (headerLine.match(/,/g) || []).length,
  };
  if (counts['\t'] >= counts[';'] && counts['\t'] >= counts[','] && counts['\t'] > 0) return '\t';
  if (counts[';'] > counts[',']) return ';';
  return ',';
}

function parseDelimitedText(rawText: string): string[][] {
  const cleaned = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!cleaned) return [];

  const firstNewline = cleaned.indexOf('\n');
  const firstLine = firstNewline === -1 ? cleaned : cleaned.slice(0, firstNewline);
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentVal += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentVal += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if (ch === '\n') {
      currentRow.push(currentVal.trim());
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += ch;
    }
  }

  currentRow.push(currentVal.trim());
  if (currentRow.some((cell) => cell !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

function normalizeHeaderName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeGender(val: string): 'L' | 'P' | '' {
  const low = val.trim().toLowerCase();
  if (low === 'l' || low === 'laki-laki' || low === 'laki' || low === 'pria' || low === 'm') return 'L';
  if (low === 'p' || low === 'perempuan' || low === 'wanita' || low === 'f') return 'P';
  return '';
}

export const ImportDataView: React.FC<ImportDataViewProps> = ({
  workspaceId,
  initialTarget = 'siswa',
  moduleConfigs,
  onNavigateToModule,
  onNotify,
}) => {
  const [targetModule, setTargetModule] = useState<ImportTargetModule>(initialTarget);
  const [rawInput, setRawInput] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  const activeConfig = moduleConfigs[targetModule];
  const baseFields = MODULE_BASE_FIELDS[targetModule];
  const customFields = activeConfig?.customFields || [];

  const handleTargetChange = (next: ImportTargetModule) => {
    setTargetModule(next);
    setRawInput('');
    setFileName(null);
    setImportSuccessCount(null);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      ...baseFields.map((f) => activeConfig?.columnLabels?.[f.key]?.trim() || f.defaultLabel),
      ...customFields.map((cf) => cf.label),
    ];

    const sampleRow1 = baseFields.map((f) => {
      if (f.key === 'nisn') return '0098123456';
      if (f.key === 'nis') return '26271099';
      if (f.key === 'nip') return '19870615 201402 1 002';
      if (f.key === 'nuptk') return '5947765666130012';
      if (f.key === 'kodePegawai') return 'KRY-TU-010';
      if (f.key === 'nama') return targetModule === 'siswa' ? 'Rafi Pratama' : targetModule === 'guru' ? 'Dra. Lestari Widyawati' : 'Andi Kurniawan';
      if (f.key === 'jenisKelamin') return 'L';
      if (f.key === 'kelas') return 'X-A';
      if (f.key === 'angkatan') return '2026';
      if (f.key === 'ttl') return 'Semarang, 12 April 2010';
      if (f.key === 'namaWali') return 'Bambang Wijaya';
      if (f.key === 'teleponWali' || f.key === 'telepon') return '0812-3344-5566';
      if (f.key === 'mataPelajaran') return 'Matematika';
      if (f.key === 'statusKepegawaian') return 'PPPK';
      if (f.key === 'jabatanTambahan') return 'Wali Kelas X-A';
      if (f.key === 'pendidikan') return 'S1 / D4';
      if (f.key === 'email') return 'email@sekolah.sch.id';
      if (f.key === 'divisi') return 'Tata Usaha';
      if (f.key === 'jabatan') return 'Staf Administrasi';
      if (f.key === 'tanggalMasuk') return '2024-07-01';
      if (f.key === 'alamat') return 'Jl. Merdeka No. 10, Semarang';
      if (f.key === 'status') return 'Aktif';
      return '';
    });

    customFields.forEach(() => sampleRow1.push(''));

    const csv =
      '\uFEFF' +
      [headers, sampleRow1]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template-import-${targetModule}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify(`Template CSV ${activeConfig.displayName} berhasil diunduh.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportSuccessCount(null);

    const reader = new FileReader();
    reader.onload = () => {
      setRawInput(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const parsedResult = useMemo(() => {
    const grid = parseDelimitedText(rawInput);
    if (grid.length < 2) {
      return { headers: grid[0] || [], rows: [] as ParsedImportRow[] };
    }

    const rawHeaders = grid[0];
    const headerLookup = new Map<number, { type: 'base' | 'custom'; key: string }>();

    rawHeaders.forEach((h, idx) => {
      const norm = normalizeHeaderName(h);
      if (!norm) return;

      const matchedBase = baseFields.find((f) => {
        const customLabel = activeConfig?.columnLabels?.[f.key] || '';
        return (
          normalizeHeaderName(f.key) === norm ||
          normalizeHeaderName(f.defaultLabel) === norm ||
          (customLabel && normalizeHeaderName(customLabel) === norm)
        );
      });

      if (matchedBase) {
        headerLookup.set(idx, { type: 'base', key: matchedBase.key });
        return;
      }

      const matchedCustom = customFields.find(
        (cf) => normalizeHeaderName(cf.key) === norm || normalizeHeaderName(cf.label) === norm,
      );
      if (matchedCustom) {
        headerLookup.set(idx, { type: 'custom', key: matchedCustom.key });
      }
    });

    const parsedRows: ParsedImportRow[] = grid.slice(1).map((cells, rIdx) => {
      const payload: Record<string, unknown> = {};
      const customValues: Record<string, string | number> = {};
      const errors: string[] = [];

      headerLookup.forEach((mapping, colIdx) => {
        const val = (cells[colIdx] ?? '').trim();
        if (mapping.type === 'base') {
          payload[mapping.key] = val;
        } else if (val !== '') {
          const cfDef = customFields.find((c) => c.key === mapping.key);
          customValues[mapping.key] = cfDef?.type === 'number' ? Number(val) || 0 : val;
        }
      });

      if (Object.keys(customValues).length > 0) {
        payload.customValues = customValues;
      }

      // Normalize gender & defaults
      if (typeof payload.jenisKelamin === 'string' && payload.jenisKelamin !== '') {
        const normGender = normalizeGender(payload.jenisKelamin);
        if (!normGender) {
          errors.push('Jenis kelamin harus L atau P');
        } else {
          payload.jenisKelamin = normGender;
        }
      } else {
        payload.jenisKelamin = 'L';
      }

      const statusField = baseFields.find((f) => f.key === 'status');
      const allowedStatuses = statusField?.fixedOptions || ['Aktif'];
      const rawStatus = String(payload.status ?? '').trim();
      if (!rawStatus) {
        payload.status = 'Aktif';
      } else {
        const matchedStatus = allowedStatuses.find(
          (s) => s.toLowerCase() === rawStatus.toLowerCase(),
        );
        if (!matchedStatus) {
          errors.push(`Status "${rawStatus}" tidak valid`);
        } else {
          payload.status = matchedStatus;
        }
      }

      // Check required fields
      baseFields.forEach((f) => {
        if (f.required && !String(payload[f.key] ?? '').trim()) {
          const label = activeConfig?.columnLabels?.[f.key]?.trim() || f.defaultLabel;
          errors.push(`${label} kosong`);
        }
      });

      const summaryCode = String(
        payload.nisn || payload.nip || payload.kodePegawai || '-',
      );
      const summaryName = String(payload.nama || '-');

      return {
        rowNumber: rIdx + 2,
        payload,
        summaryCode,
        summaryName,
        errors,
      };
    });

    return { headers: rawHeaders, rows: parsedRows };
  }, [rawInput, baseFields, customFields, activeConfig]);

  const validRows = useMemo(
    () => parsedResult.rows.filter((r) => r.errors.length === 0),
    [parsedResult.rows],
  );
  const invalidRows = useMemo(
    () => parsedResult.rows.filter((r) => r.errors.length > 0),
    [parsedResult.rows],
  );

  const handleCommitImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const count = await batchCreateModuleRecords(
        workspaceId,
        targetModule,
        validRows.map((r) => r.payload),
      );
      setImportSuccessCount(count);
      setRawInput('');
      setFileName(null);
      onNotify(`${count} data ${activeConfig.displayName} berhasil diimpor ke database.`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Import Data Massal (CSV / Excel)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unggah file CSV atau tempel data langsung dari spreadsheet untuk memasukkan banyak data siswa, guru, atau karyawan sekaligus.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Template CSV</span>
        </button>
      </div>

      {/* Target Module Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {IMPORT_TARGETS.map((item) => {
          const active = targetModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTargetChange(item.id)}
              className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
              }`}
            >
              <p className="font-display text-sm font-bold">
                {moduleConfigs[item.id]?.displayName || item.label}
              </p>
              <p className={`text-xs mt-1 ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                {item.desc}
              </p>
            </button>
          );
        })}
      </div>

      {importSuccessCount !== null && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold">
                {importSuccessCount} data berhasil disimpan ke {activeConfig.displayName}.
              </p>
              <p className="text-emerald-700">
                Seluruh record telah tersinkron ke Cloud Firestore.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToModule(targetModule)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Lihat {activeConfig.displayName}
          </button>
        </div>
      )}

      {/* Upload & Paste Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-display text-sm font-bold text-slate-900">
              1. Sumber Data ({activeConfig.displayName})
            </h2>
            {fileName && <span className="text-xs font-mono text-slate-500 truncate max-w-[160px]">{fileName}</span>}
          </div>

          <label className="flex flex-col items-center justify-center gap-2 p-6 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-center">
            <Upload className="w-6 h-6 text-slate-600" />
            <span className="text-xs font-semibold text-slate-800">
              Pilih File CSV / TSV dari Perangkat
            </span>
            <span className="text-[11px] text-slate-500">
              Mendukung pemisah koma (,), titik koma (;), atau tab
            </span>
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              onChange={handleFileUpload}
              className="sr-only"
            />
          </label>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Atau Tempel Data dari Excel / Google Sheets
            </label>
            <textarea
              rows={8}
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setImportSuccessCount(null);
              }}
              placeholder={`Contoh:\n${baseFields
                .slice(0, 5)
                .map((f) => activeConfig?.columnLabels?.[f.key]?.trim() || f.defaultLabel)
                .join(',')}\n...`}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Kolom wajib untuk {activeConfig.displayName}:</p>
            <p className="leading-relaxed">
              {baseFields
                .filter((f) => f.required)
                .map((f) => activeConfig?.columnLabels?.[f.key]?.trim() || f.defaultLabel)
                .join(' · ')}
            </p>
          </div>
        </div>

        {/* Validation Preview */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                2. Pratinjau &amp; Validasi Data
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {parsedResult.rows.length === 0
                  ? 'Belum ada baris data terbaca'
                  : `${validRows.length} baris siap diimpor · ${invalidRows.length} baris perlu perbaikan`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCommitImport}
              disabled={validRows.length === 0 || importing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {importing
                  ? 'Mengimpor...'
                  : `Import ${validRows.length} Data Valid`}
              </span>
            </button>
          </div>

          {parsedResult.rows.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700">
                Unggah file CSV atau tempel baris tabel di sebelah kiri.
              </p>
              <p className="text-xs text-slate-500">
                Baris pertama harus berisi nama kolom (header) sesuai template agar data otomatis dipetakan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 w-14 text-center tabular-nums">Baris</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">
                      {targetModule === 'siswa' ? 'NISN' : targetModule === 'guru' ? 'NIP' : 'ID Pegawai'}
                    </th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Nama Lengkap</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">
                      {targetModule === 'siswa' ? 'Kelas' : targetModule === 'guru' ? 'Mapel' : 'Divisi'}
                    </th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {parsedResult.rows.slice(0, 150).map((row) => {
                    const isValid = row.errors.length === 0;
                    return (
                      <tr key={row.rowNumber} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-center font-mono tabular-nums text-slate-500">
                          {row.rowNumber}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums text-slate-800">
                          {row.summaryCode}
                        </td>
                        <td className="px-4 py-2.5 text-slate-900 font-medium">
                          {row.summaryName}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {String(
                            row.payload.kelas ||
                              row.payload.mataPelajaran ||
                              row.payload.divisi ||
                              '-',
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-red-700 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{row.errors.join(', ')}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {parsedResult.rows.length > 150 && (
                <div className="px-4 py-2.5 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
                  Menampilkan 150 dari {parsedResult.rows.length} baris pada pratinjau. Seluruh baris valid akan tetap diimpor.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
