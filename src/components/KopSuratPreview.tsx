import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { KopSuratConfig } from '../types/database';

interface KopSuratPreviewProps {
  kop: KopSuratConfig;
  compact?: boolean;
}

export const KopSuratPreview: React.FC<KopSuratPreviewProps> = ({ kop, compact = false }) => {
  const [imgError, setImgError] = useState(false);

  const logoDimClass =
    kop.ukuranLogo === 'sm'
      ? compact
        ? 'w-11 h-11'
        : 'w-14 h-14'
      : kop.ukuranLogo === 'lg'
        ? compact
          ? 'w-16 h-16'
          : 'w-24 h-24'
        : compact
          ? 'w-14 h-14'
          : 'w-20 h-20';

  const instansiLines = kop.instansiInduk
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="w-full text-slate-900 select-none">
      <div
        className={`flex items-center gap-4 pb-3 ${
          kop.posisiTeks === 'left' ? 'justify-start' : 'justify-between'
        }`}
      >
        {kop.logoUrl && !imgError ? (
          <div className={`${logoDimClass} shrink-0 flex items-center justify-center`}>
            <img
              src={kop.logoUrl}
              alt={`Logo ${kop.namaSekolah}`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div
            className={`${logoDimClass} shrink-0 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center`}
          >
            <Building2 className="w-7 h-7 text-slate-400" />
          </div>
        )}

        <div
          className={`flex-1 min-w-0 ${
            kop.posisiTeks === 'center' ? 'text-center' : 'text-left'
          }`}
        >
          {instansiLines.map((line, idx) => (
            <p
              key={idx}
              className={`${
                compact ? 'text-[11px]' : 'text-xs md:text-sm'
              } font-semibold tracking-wide uppercase leading-snug text-slate-800`}
            >
              {line}
            </p>
          ))}
          <h2
            style={{ color: kop.warnaAksen || '#0F172A' }}
            className={`font-display font-extrabold tracking-tight uppercase leading-tight mt-0.5 ${
              compact ? 'text-base md:text-lg' : 'text-lg md:text-2xl'
            }`}
          >
            {kop.namaSekolah || 'NAMA INSTANSI / SEKOLAH'}
          </h2>
          {kop.subJudul && (
            <p
              className={`${
                compact ? 'text-[10px]' : 'text-xs'
              } font-medium text-slate-700 mt-0.5`}
            >
              {kop.subJudul}
            </p>
          )}
          {kop.alamat && (
            <p
              className={`${
                compact ? 'text-[10px]' : 'text-xs'
              } text-slate-600 mt-0.5 leading-snug`}
            >
              {kop.alamat}
            </p>
          )}
          {kop.kontak && (
            <p
              className={`${
                compact ? 'text-[10px]' : 'text-[11px]'
              } text-slate-600 leading-snug`}
            >
              {kop.kontak}
            </p>
          )}
        </div>

        {kop.posisiTeks === 'center' && (
          <div className={`${logoDimClass} shrink-0 hidden sm:block`} aria-hidden="true" />
        )}
      </div>

      {/* Garis Pemisah Kop Resmi */}
      <div className="w-full">
        {kop.gayaGaris === 'double' && (
          <div
            style={{ borderColor: kop.warnaAksen || '#0F172A' }}
            className="border-t-2 border-b-2 h-1.5"
          />
        )}
        {kop.gayaGaris === 'thick-thin' && (
          <div className="space-y-0.5">
            <div style={{ backgroundColor: kop.warnaAksen || '#0F172A' }} className="h-[3px] w-full" />
            <div style={{ backgroundColor: kop.warnaAksen || '#0F172A' }} className="h-[1px] w-full" />
          </div>
        )}
        {kop.gayaGaris === 'solid' && (
          <div style={{ backgroundColor: kop.warnaAksen || '#0F172A' }} className="h-[2px] w-full" />
        )}
      </div>
    </div>
  );
};
