import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Building2, FileText, FolderKanban, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { DEFAULT_LOGO_PATH } from '../lib/defaults';

export const AuthGate: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 md:p-12">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-8 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
            {!logoFailed ? (
              <img
                src={DEFAULT_LOGO_PATH}
                alt="Logo SINTATA"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <Building2 className="w-5 h-5 text-slate-700" />
            )}
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            SINTATA
          </span>
        </div>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
          Sistem Informasi Tata Usaha &amp; Database Sekolah
        </span>
      </header>

      <main className="max-w-5xl w-full mx-auto py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <p className="text-xs font-medium text-slate-500 tracking-wide">
            Tata Usaha · Inventaris · Akademik · Kepegawaian
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-900 leading-tight text-balance">
            Pusat Database Persuratan, Aset, Guru, Siswa, dan Karyawan yang Dapat Diubah Sesuai Kebutuhan Sekolah.
          </h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
            Kelola agenda surat masuk dan keluar beserta cetak kop surat dinamis, pencatatan aset sarana prasarana, direktori pendidik, peserta didik, serta staf tata usaha dalam satu basis data cloud yang aman dan dapat disesuaikan strukturnya.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2.5 text-slate-900 font-medium text-sm mb-1">
                <FileText className="w-4 h-4 text-slate-700" />
                <span>Persuratan &amp; Set Kop Resmi</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ubah logo instansi, nama dinas, garis pemisah, dan cetak surat langsung dengan kop aktif.
              </p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2.5 text-slate-900 font-medium text-sm mb-1">
                <FolderKanban className="w-4 h-4 text-slate-700" />
                <span>Dashboard &amp; Kolom Dinamis</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sesuaikan label kolom, opsi pilihan, susunan widget dashboard, hingga tambah kolom kustom.
              </p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2.5 text-slate-900 font-medium text-sm mb-1">
                <GraduationCap className="w-4 h-4 text-slate-700" />
                <span>Database Guru &amp; Siswa</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pencarian cepat NIP, NUPTK, NISN, kelas, serta ekspor CSV siap pakai.
              </p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2.5 text-slate-900 font-medium text-sm mb-1">
                <Users className="w-4 h-4 text-slate-700" />
                <span>Aset &amp; Karyawan Terpadu</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pantau nilai aset, kondisi barang, lokasi ruang, dan data tenaga kependidikan.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Akses Terenkripsi &amp; Terisolasi Per Akun</span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Masuk ke Ruang Kerja Tata Usaha
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Gunakan akun Google resmi atau akun pengelola sekolah untuk membuka database dan menyimpan perubahan secara otomatis.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              <span>{loading ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}</span>
            </button>

            <p className="text-xs text-slate-500 leading-relaxed">
              Saat pertama kali masuk, contoh data awal dan Kop Surat standar akan disiapkan otomatis agar langsung dapat dicoba dan diubah.
            </p>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <span>SINTATA · Manajemen Administrasi &amp; Database Sekolah</span>
        <span>Penyimpanan Cloud Firestore</span>
      </footer>
    </div>
  );
};
