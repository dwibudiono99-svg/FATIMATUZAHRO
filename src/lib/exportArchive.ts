import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AnyModuleRecord,
  CustomFieldDef,
  FieldSchemaDef,
  KopSuratConfig,
  ModuleId,
} from '../types/database';

interface ExportColumn {
  key: string;
  label: string;
  isCustom?: boolean;
  isNumeric?: boolean;
}

const formatRupiahPlain = (val: unknown): string => {
  const num = Number(val ?? 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
};

function buildExportColumns(
  baseColumns: FieldSchemaDef[],
  customColumns: CustomFieldDef[],
  columnLabels: Record<string, string>,
): ExportColumn[] {
  const base: ExportColumn[] = baseColumns.map((col) => ({
    key: col.key,
    label: columnLabels?.[col.key]?.trim() || col.defaultLabel,
    isNumeric: col.isNumeric,
  }));
  const custom: ExportColumn[] = customColumns.map((cf) => ({
    key: cf.key,
    label: cf.label,
    isCustom: true,
    isNumeric: cf.type === 'number',
  }));
  return [...base, ...custom];
}

function getCellExportText(rec: AnyModuleRecord, col: ExportColumn): string {
  const raw = col.isCustom
    ? rec.customValues?.[col.key]
    : (rec as unknown as Record<string, unknown>)[col.key];
  if (raw === undefined || raw === null || raw === '') return '-';
  if (col.key === 'nilaiPerolehan') return formatRupiahPlain(raw);
  return String(raw);
}

export function exportRecordsToCSV(params: {
  moduleId: ModuleId;
  moduleDisplayName: string;
  records: AnyModuleRecord[];
  baseColumns: FieldSchemaDef[];
  customColumns: CustomFieldDef[];
  columnLabels: Record<string, string>;
}): void {
  const { moduleId, records, baseColumns, customColumns, columnLabels } = params;
  const cols = buildExportColumns(baseColumns, customColumns, columnLabels);

  const headers = ['No', ...cols.map((c) => c.label)];
  const rows = records.map((rec, idx) => {
    const vals = cols.map((col) => {
      const text = getCellExportText(rec, col);
      return `"${text.replace(/"/g, '""')}"`;
    });
    return [`"${idx + 1}"`, ...vals].join(',');
  });

  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `arsip-${moduleId}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportRecordsToPDF(params: {
  moduleId: ModuleId;
  moduleDisplayName: string;
  records: AnyModuleRecord[];
  baseColumns: FieldSchemaDef[];
  customColumns: CustomFieldDef[];
  columnLabels: Record<string, string>;
  kopSurat: KopSuratConfig;
  filterLabel?: string;
}): Promise<void> {
  const {
    moduleId,
    moduleDisplayName,
    records,
    baseColumns,
    customColumns,
    columnLabels,
    kopSurat,
    filterLabel,
  } = params;

  const cols = buildExportColumns(baseColumns, customColumns, columnLabels);
  const orientation = cols.length > 5 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let cursorY = 14;

  // Render active Kop Surat header
  const logoData = await loadImageAsDataUrl(kopSurat.logoUrl);
  const logoSize = kopSurat.ukuranLogo === 'sm' ? 15 : kopSurat.ukuranLogo === 'lg' ? 22 : 18;
  if (logoData) {
    try {
      const format = logoData.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(logoData, format, marginX, cursorY, logoSize, logoSize);
    } catch {
      // Ignore logo decode issues so PDF generation always succeeds
    }
  }

  const textCenterX = kopSurat.posisiTeks === 'left' ? marginX + (logoData ? logoSize + 6 : 0) : pageWidth / 2;
  const textAlign = kopSurat.posisiTeks === 'left' ? 'left' : 'center';

  let headerTextY = cursorY + 4;
  const instansiLines = (kopSurat.instansiInduk || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  instansiLines.forEach((line) => {
    doc.text(line.toUpperCase(), textCenterX, headerTextY, { align: textAlign });
    headerTextY += 4.2;
  });

  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text((kopSurat.namaSekolah || 'NAMA INSTANSI').toUpperCase(), textCenterX, headerTextY + 1, {
    align: textAlign,
  });
  headerTextY += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  if (kopSurat.subJudul) {
    doc.text(kopSurat.subJudul, textCenterX, headerTextY, { align: textAlign });
    headerTextY += 3.8;
  }
  if (kopSurat.alamat) {
    doc.text(kopSurat.alamat, textCenterX, headerTextY, { align: textAlign });
    headerTextY += 3.8;
  }
  if (kopSurat.kontak) {
    doc.text(kopSurat.kontak, textCenterX, headerTextY, { align: textAlign });
    headerTextY += 3.8;
  }

  const lineY = Math.max(cursorY + logoSize + 3, headerTextY + 2);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.7);
  doc.line(marginX, lineY, pageWidth - marginX, lineY);
  if (kopSurat.gayaGaris !== 'solid') {
    doc.setLineWidth(0.25);
    doc.line(marginX, lineY + 1.1, pageWidth - marginX, lineY + 1.1);
  }

  cursorY = lineY + 8;

  // Document title & metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`ARSIP DATA: ${moduleDisplayName.toUpperCase()}`, marginX, cursorY);

  const exportDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const metaParts = [
    `Tanggal Ekspor: ${exportDateStr}`,
    `Total Data: ${records.length} entri`,
    ...(filterLabel && filterLabel !== 'semua' ? [`Filter: ${filterLabel}`] : []),
  ];
  doc.text(metaParts.join('  ·  '), marginX, cursorY + 5);

  // Table headers & body
  const head = [['No', ...cols.map((c) => c.label)]];
  const body = records.map((rec, idx) => [
    String(idx + 1),
    ...cols.map((col) => getCellExportText(rec, col)),
  ]);

  const columnStyles: Record<number, { halign?: 'left' | 'center' | 'right'; cellWidth?: number }> = {
    0: { halign: 'center', cellWidth: 10 },
  };
  cols.forEach((col, i) => {
    if (col.isNumeric) {
      columnStyles[i + 1] = { halign: 'right' };
    }
  });

  autoTable(doc, {
    startY: cursorY + 9,
    head,
    body,
    margin: { left: marginX, right: marginX },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
  });

  const lastTableY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 30;
  let footerY = lastTableY + 10;

  if (moduleId === 'aset') {
    const totalVal = records.reduce(
      (sum, r) => sum + (Number((r as { nilaiPerolehan?: number }).nilaiPerolehan) || 0),
      0,
    );
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Valuasi Aset: ${formatRupiahPlain(totalVal)}`, marginX, footerY);
    footerY += 8;
  }

  // Signatory block if room allows, else add new page
  if (footerY + 32 > pageHeight - 12) {
    doc.addPage();
    footerY = 20;
  }

  const signX = pageWidth - marginX - 62;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${kopSurat.kotaPenetapan || 'Semarang'}, ${exportDateStr}`, signX, footerY);
  doc.text(`${kopSurat.jabatanKepala || 'Kepala Sekolah'},`, signX, footerY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text(kopSurat.namaKepala || '-', signX, footerY + 22);
  doc.setFont('helvetica', 'normal');
  if (kopSurat.nipKepala) {
    doc.text(`NIP. ${kopSurat.nipKepala}`, signX, footerY + 26.5);
  }

  // Page numbering
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Arsip Digital ${kopSurat.namaSekolah || 'SINTATA'} · Halaman ${i} dari ${totalPages}`,
      marginX,
      pageHeight - 8,
    );
  }

  doc.save(`arsip-${moduleId}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
