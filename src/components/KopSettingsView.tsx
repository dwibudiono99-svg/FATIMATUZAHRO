import React, { useState } from 'react';
import { RotateCcw, Save, Upload } from 'lucide-react';
import { DEFAULT_KOP_SURAT, DEFAULT_LOGO_PATH } from '../lib/defaults';
import { saveKopSuratConfig } from '../lib/firestoreService';
import { KopSuratConfig } from '../types/database';
import { KopSuratPreview } from './KopSuratPreview';

interface KopSettingsViewProps {
  workspaceId: string;
  kopSurat: KopSuratConfig;
  onNotify: (msg: string) => void;
}

const ACCENT_PRESETS = [
  { label: 'Hitam Slate', value: '#0F172A' },
  { label: 'Biru Instansi', value: '#1E3A8A' },
  { label: 'Hijau Madrasah', value: '#065F46' },
  { label: 'Merah Marun', value: '#7F1D1D' },
];

export const KopSettingsView: React.FC<KopSettingsViewProps> = ({
  workspaceId,
  kopSurat,
  onNotify,
}) => {
  const [draft, setDraft] = useState<KopSuratConfig>(kopSurat);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 240;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/png');
        if (dataUri.length > 220000) {
          setUploadError('Ukuran gambar logo terlalu besar setelah kompresi. Gunakan logo yang lebih sederhana.');
          return;
        }
        setDraft((prev) => ({ ...prev, logoUrl: dataUri }));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveKopSuratConfig(workspaceId, draft);
      onNotify('Pengaturan Kop Surat berhasil disimpan ke database.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(DEFAULT_KOP_SURAT);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan Kop Surat Resmi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ubah identitas instansi, logo sekolah, garis pembatas, dan pejabat penandatangan untuk seluruh cetakan surat.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Kembalikan Standar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Form Controls */}
        <form
          onSubmit={handleSave}
          className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="space-y-4">
            <h2 className="font-display text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Identitas Lembaga &amp; Alamat
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Instansi Induk / Yayasan / Dinas (Baris Atas)
              </label>
              <textarea
                rows={2}
                value={draft.instansiInduk}
                maxLength={200}
                onChange={(e) => setDraft({ ...draft, instansiInduk: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nama Sekolah / Instansi Utama
              </label>
              <input
                type="text"
                required
                value={draft.namaSekolah}
                maxLength={200}
                onChange={(e) => setDraft({ ...draft, namaSekolah: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Sub Judul (Akreditasi / NPSN / NSS)
              </label>
              <input
                type="text"
                value={draft.subJudul}
                maxLength={240}
                onChange={(e) => setDraft({ ...draft, subJudul: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Alamat Lengkap
              </label>
              <input
                type="text"
                value={draft.alamat}
                maxLength={300}
                onChange={(e) => setDraft({ ...draft, alamat: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Kontak (Telepon, Email, Website)
              </label>
              <input
                type="text"
                value={draft.kontak}
                maxLength={240}
                onChange={(e) => setDraft({ ...draft, kontak: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="font-display text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Logo, Gaya Garis &amp; Warna Teks
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Logo Baru</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, logoUrl: DEFAULT_LOGO_PATH })}
                className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Pakai Logo Bawaan
              </button>
            </div>
            {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Ukuran Logo</label>
                <select
                  value={draft.ukuranLogo}
                  onChange={(e) =>
                    setDraft({ ...draft, ukuranLogo: e.target.value as KopSuratConfig['ukuranLogo'] })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="sm">Kecil</option>
                  <option value="md">Sedang</option>
                  <option value="lg">Besar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Gaya Garis</label>
                <select
                  value={draft.gayaGaris}
                  onChange={(e) =>
                    setDraft({ ...draft, gayaGaris: e.target.value as KopSuratConfig['gayaGaris'] })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="thick-thin">Tebal - Tipis</option>
                  <option value="double">Garis Ganda</option>
                  <option value="solid">Garis Tunggal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Perataan Teks</label>
                <select
                  value={draft.posisiTeks}
                  onChange={(e) =>
                    setDraft({ ...draft, posisiTeks: e.target.value as KopSuratConfig['posisiTeks'] })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="center">Tengah (Standar)</option>
                  <option value="left">Rata Kiri</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Warna Aksen Judul &amp; Garis
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, warnaAksen: preset.value })}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border cursor-pointer ${
                      draft.warnaAksen === preset.value
                        ? 'border-slate-900 bg-slate-100 font-semibold text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: preset.value }}
                    />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="font-display text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Pejabat Penandatangan &amp; Kota
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Kota Penetapan</label>
                <input
                  type="text"
                  value={draft.kotaPenetapan}
                  maxLength={100}
                  onChange={(e) => setDraft({ ...draft, kotaPenetapan: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Jabatan Pimpinan</label>
                <input
                  type="text"
                  value={draft.jabatanKepala}
                  maxLength={120}
                  onChange={(e) => setDraft({ ...draft, jabatanKepala: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Nama Pimpinan</label>
                <input
                  type="text"
                  value={draft.namaKepala}
                  maxLength={140}
                  onChange={(e) => setDraft({ ...draft, namaKepala: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">NIP Pimpinan</label>
                <input
                  type="text"
                  value={draft.nipKepala}
                  maxLength={60}
                  onChange={(e) => setDraft({ ...draft, nipKepala: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Nama Kepala TU</label>
                <input
                  type="text"
                  value={draft.namaKaTU}
                  maxLength={140}
                  onChange={(e) => setDraft({ ...draft, namaKaTU: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">NIP Kepala TU</label>
                <input
                  type="text"
                  value={draft.nipKaTU}
                  maxLength={60}
                  onChange={(e) => setDraft({ ...draft, nipKaTU: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan Kop'}</span>
            </button>
          </div>
        </form>

        {/* Live Paper Preview */}
        <div className="xl:col-span-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700">Pratinjau Langsung Lembar Surat</span>
            <span>Perubahan tampil otomatis</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-8 md:p-10 space-y-6">
            <KopSuratPreview kop={draft} />

            <div className="space-y-4 pt-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Nomor : 421.3/109/TU/XI/2026</span>
                <span>{draft.kotaPenetapan || 'Semarang'}, 26 November 2026</span>
              </div>
              <p>Hal : Contoh Tata Letak Surat Resmi</p>
              <div className="space-y-2 pt-2">
                <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-full" />
                <div className="h-2.5 bg-slate-100 rounded w-5/6" />
                <div className="h-2.5 bg-slate-100 rounded w-2/3" />
              </div>
              <div className="pt-8 flex justify-end">
                <div className="w-56 text-slate-800 space-y-12">
                  <p>{draft.jabatanKepala || 'Kepala Sekolah'},</p>
                  <div>
                    <p className="font-semibold underline underline-offset-4">
                      {draft.namaKepala || 'Nama Pimpinan'}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      NIP. {draft.nipKepala || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
