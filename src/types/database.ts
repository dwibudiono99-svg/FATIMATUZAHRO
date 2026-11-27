export type ModuleId = 'persuratan' | 'aset' | 'guru' | 'siswa' | 'karyawan';

export type ViewRoute =
  | 'dashboard'
  | ModuleId
  | 'import-data'
  | 'kop-surat'
  | 'pengaturan-db';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface KopSuratConfig {
  instansiInduk: string;
  namaSekolah: string;
  subJudul: string;
  alamat: string;
  kontak: string;
  kotaPenetapan: string;
  namaKepala: string;
  nipKepala: string;
  jabatanKepala: string;
  namaKaTU: string;
  nipKaTU: string;
  logoUrl: string;
  ukuranLogo: 'sm' | 'md' | 'lg';
  gayaGaris: 'double' | 'thick-thin' | 'solid';
  warnaAksen: string;
  posisiTeks: 'center' | 'left';
}

export type DashboardThemeColor = 'slate' | 'navy' | 'emerald' | 'amber';

export interface DashboardConfig {
  judul: string;
  subjudul: string;
  tahunAjaran: string;
  kepadatanTabel: 'nyaman' | 'padat';
  warnaTema: DashboardThemeColor;
  widgetTampil: string[];
  urutanModul: ModuleId[];
}

export interface WorkspaceConfigDoc {
  ownerId: string;
  kopSurat: KopSuratConfig;
  dashboardConfig: DashboardConfig;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface CustomFieldDef {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[];
  showInTable: boolean;
}

export interface ModuleConfigDoc {
  ownerId: string;
  moduleId: ModuleId;
  displayName: string;
  hiddenColumns: string[];
  columnLabels: Record<string, string>;
  selectOptions: Record<string, string[]>;
  customFields: CustomFieldDef[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BaseRecord {
  id: string;
  ownerId: string;
  customValues?: Record<string, string | number>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LetterRecord extends BaseRecord {
  nomorSurat: string;
  jenis: 'Surat Masuk' | 'Surat Keluar';
  kategori: string;
  tanggalSurat: string;
  tanggalAgenda?: string;
  pihakTerkait: string;
  perihal: string;
  sifat: 'Biasa' | 'Penting' | 'Segera' | 'Rahasia';
  status: 'Draft' | 'Diproses' | 'Terkirim' | 'Diterima' | 'Diarsipkan';
  isiRingkas?: string;
  penandatangan?: string;
  disposisi?: string;
}

export interface AssetRecord extends BaseRecord {
  kodeAset: string;
  namaAset: string;
  kategori: string;
  lokasi: string;
  jumlah: number;
  satuan: string;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  tahunPerolehan?: string;
  sumberDana?: string;
  nilaiPerolehan: number;
  penanggungJawab?: string;
  keterangan?: string;
}

export interface TeacherRecord extends BaseRecord {
  nip: string;
  nuptk?: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  mataPelajaran: string;
  statusKepegawaian: string;
  jabatanTambahan?: string;
  pendidikan?: string;
  telepon?: string;
  email?: string;
  alamat?: string;
  status: 'Aktif' | 'Cuti' | 'Mutasi' | 'Pensiun';
}

export interface StudentRecord extends BaseRecord {
  nisn: string;
  nis?: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  kelas: string;
  angkatan: string;
  ttl?: string;
  namaWali?: string;
  teleponWali?: string;
  alamat?: string;
  status: 'Aktif' | 'Lulus' | 'Pindah' | 'Non-Aktif';
}

export interface EmployeeRecord extends BaseRecord {
  kodePegawai: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  divisi: string;
  jabatan: string;
  statusKepegawaian: string;
  telepon?: string;
  tanggalMasuk?: string;
  alamat?: string;
  status: 'Aktif' | 'Cuti' | 'Resign';
}

export type AnyModuleRecord =
  | LetterRecord
  | AssetRecord
  | TeacherRecord
  | StudentRecord
  | EmployeeRecord;

export interface FieldSchemaDef {
  key: string;
  defaultLabel: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  optionsKey?: string;
  fixedOptions?: string[];
  isNumeric?: boolean;
  isMono?: boolean;
  maxLength: number;
  placeholder?: string;
}
