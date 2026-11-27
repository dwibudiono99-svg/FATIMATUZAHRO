import React from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  Package,
  SlidersHorizontal,
  Stamp,
  Users,
} from 'lucide-react';
import {
  AssetRecord,
  DashboardConfig,
  EmployeeRecord,
  KopSuratConfig,
  LetterRecord,
  ModuleConfigDoc,
  ModuleId,
  StudentRecord,
  TeacherRecord,
  ViewRoute,
} from '../types/database';
import { KopSuratPreview } from './KopSuratPreview';

interface DashboardViewProps {
  dashboardConfig: DashboardConfig;
  kopSurat: KopSuratConfig;
  moduleConfigs: Record<ModuleId, ModuleConfigDoc>;
  letters: LetterRecord[];
  assets: AssetRecord[];
  teachers: TeacherRecord[];
  students: StudentRecord[];
  employees: EmployeeRecord[];
  onNavigate: (view: ViewRoute) => void;
  loading: boolean;
}

const formatRupiah = (amount: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

export const DashboardView: React.FC<DashboardViewProps> = ({
  dashboardConfig,
  kopSurat,
  moduleConfigs,
  letters,
  assets,
  teachers,
  students,
  employees,
  onNavigate,
  loading,
}) => {
  const showWidget = (id: string) => dashboardConfig.widgetTampil.includes(id);

  const suratMasukCount = letters.filter((l) => l.jenis === 'Surat Masuk').length;
  const suratKeluarCount = letters.filter((l) => l.jenis === 'Surat Keluar').length;
  const totalAssetValue = assets.reduce((sum, a) => sum + (Number(a.nilaiPerolehan) || 0), 0);
  const totalAssetUnits = assets.reduce((sum, a) => sum + (Number(a.jumlah) || 0), 0);
  const assetsBaik = assets.filter((a) => a.kondisi === 'Baik').length;
  const assetsRusakRingan = assets.filter((a) => a.kondisi === 'Rusak Ringan').length;
  const assetsRusakBerat = assets.filter((a) => a.kondisi === 'Rusak Berat').length;
  const activeTeachers = teachers.filter((t) => t.status === 'Aktif').length;
  const activeStudents = students.filter((s) => s.status === 'Aktif').length;
  const activeEmployees = employees.filter((e) => e.status === 'Aktif').length;

  const accentBadgeClass =
    dashboardConfig.warnaTema === 'emerald'
      ? 'bg-emerald-700 hover:bg-emerald-800'
      : dashboardConfig.warnaTema === 'amber'
        ? 'bg-amber-700 hover:bg-amber-800'
        : dashboardConfig.warnaTema === 'slate'
          ? 'bg-slate-800 hover:bg-slate-900'
          : 'bg-blue-900 hover:bg-blue-950';

  const moduleMeta: Record<
    ModuleId,
    {
      widgetId: string;
      icon: React.ReactNode;
      count: number;
      unitLabel: string;
      secondaryText: string;
    }
  > = {
    persuratan: {
      widgetId: 'kpi-persuratan',
      icon: <FileText className="w-4 h-4 text-slate-600" />,
      count: letters.length,
      unitLabel: 'arsip surat',
      secondaryText: `${suratMasukCount} masuk · ${suratKeluarCount} keluar`,
    },
    aset: {
      widgetId: 'kpi-aset',
      icon: <Package className="w-4 h-4 text-slate-600" />,
      count: totalAssetUnits,
      unitLabel: 'unit aset',
      secondaryText: `${assets.length} jenis · ${formatRupiah(totalAssetValue)}`,
    },
    guru: {
      widgetId: 'kpi-guru',
      icon: <GraduationCap className="w-4 h-4 text-slate-600" />,
      count: teachers.length,
      unitLabel: 'pendidik',
      secondaryText: `${activeTeachers} aktif mengajar`,
    },
    siswa: {
      widgetId: 'kpi-siswa',
      icon: <Users className="w-4 h-4 text-slate-600" />,
      count: students.length,
      unitLabel: 'peserta didik',
      secondaryText: `${activeStudents} siswa aktif`,
    },
    karyawan: {
      widgetId: 'kpi-karyawan',
      icon: <Briefcase className="w-4 h-4 text-slate-600" />,
      count: employees.length,
      unitLabel: 'tenaga kependidikan',
      secondaryText: `${activeEmployees} aktif bertugas`,
    },
  };

  const visibleModules = dashboardConfig.urutanModul.filter((modId) =>
    showWidget(moduleMeta[modId].widgetId),
  );

  const recentLetters = [...letters]
    .sort((a, b) => (b.tanggalSurat || '').localeCompare(a.tanggalSurat || ''))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium text-slate-500">
            {kopSurat.namaSekolah} · {dashboardConfig.tahunAjaran}
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            {dashboardConfig.judul}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {dashboardConfig.subjudul}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('kop-surat')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Stamp className="w-4 h-4" />
            <span>Set Kop Surat</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pengaturan-db')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${accentBadgeClass}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Ubah Dashboard &amp; Database</span>
          </button>
        </div>
      </section>

      {/* Customizable Module KPI Grid */}
      {visibleModules.length > 0 && (
        <section aria-label="Ringkasan Database">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {visibleModules.map((modId) => {
              const meta = moduleMeta[modId];
              const modLabel = moduleConfigs[modId]?.displayName || modId;
              return (
                <button
                  key={modId}
                  type="button"
                  onClick={() => onNavigate(modId)}
                  className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-400 transition-colors group cursor-pointer flex flex-col justify-between gap-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600 truncate">
                      {modLabel}
                    </span>
                    {meta.icon}
                  </div>
                  <div>
                    {loading ? (
                      <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-2xl font-bold text-slate-900 tabular-nums">
                          {meta.count}
                        </span>
                        <span className="text-xs text-slate-500">{meta.unitLabel}</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1.5 truncate tabular-nums">
                      {meta.secondaryText}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {showWidget('recent-letters') && (
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Agenda Persuratan Terbaru
                </h2>
                <p className="text-xs text-slate-500">
                  Surat masuk dan keluar terkini yang tercatat di Tata Usaha
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('persuratan')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Buka Persuratan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentLetters.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-600 mb-3">Belum ada agenda surat yang dicatat.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('persuratan')}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  Catat Surat Pertama
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLetters.map((letter) => (
                  <div
                    key={letter.id}
                    className="px-6 py-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {letter.perihal}
                      </p>
                      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
                        <span className="font-mono tabular-nums text-slate-700">
                          {letter.nomorSurat}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{letter.jenis}</span>
                        <span aria-hidden="true">·</span>
                        <span>{letter.pihakTerkait}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className="font-mono tabular-nums text-slate-500">
                        {letter.tanggalSurat}
                      </span>
                      <span
                        className={`font-medium ${
                          letter.status === 'Terkirim' || letter.status === 'Diterima'
                            ? 'text-emerald-700'
                            : letter.status === 'Diproses'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                        }`}
                      >
                        {letter.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="lg:col-span-5 space-y-6">
          {showWidget('asset-condition') && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Kondisi Aset &amp; Inventaris
                  </h2>
                  <p className="text-xs text-slate-500 tabular-nums">
                    Total valuasi {formatRupiah(totalAssetValue)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('aset')}
                  className="text-xs font-medium text-slate-700 hover:text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Kelola Aset
                </button>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">Kondisi Baik</span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-700">
                    {assetsBaik} item
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600"
                    style={{
                      width: `${assets.length ? Math.round((assetsBaik / assets.length) * 100) : 0}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-700 font-medium">Rusak Ringan</span>
                  <span className="font-mono tabular-nums font-semibold text-amber-700">
                    {assetsRusakRingan} item
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{
                      width: `${assets.length ? Math.round((assetsRusakRingan / assets.length) * 100) : 0}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-700 font-medium">Rusak Berat</span>
                  <span className="font-mono tabular-nums font-semibold text-red-700">
                    {assetsRusakBerat} item
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600"
                    style={{
                      width: `${assets.length ? Math.round((assetsRusakBerat / assets.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          {showWidget('kop-summary') && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-600" />
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Kop Surat Aktif
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('kop-surat')}
                  className="text-xs font-medium text-slate-700 hover:text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Ubah Kop
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                <KopSuratPreview kop={kopSurat} compact />
              </div>

              <div className="text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <span>Kepala: {kopSurat.namaKepala || '-'}</span>
                <span>Ka. TU: {kopSurat.namaKaTU || '-'}</span>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
