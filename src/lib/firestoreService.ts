import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError } from './firebase';
import {
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_KOP_SURAT,
  DEFAULT_MODULE_CONFIGS,
  MODULE_BASE_FIELDS,
  SAMPLE_ASSETS,
  SAMPLE_EMPLOYEES,
  SAMPLE_LETTERS,
  SAMPLE_STUDENTS,
  SAMPLE_TEACHERS,
} from './defaults';
import {
  DashboardConfig,
  KopSuratConfig,
  ModuleConfigDoc,
  ModuleId,
  OperationType,
} from '../types/database';

const MODULE_COLLECTION_MAP: Record<ModuleId, string> = {
  persuratan: 'letters',
  aset: 'assets',
  guru: 'teachers',
  siswa: 'students',
  karyawan: 'employees',
};

export function getModuleCollectionName(moduleId: ModuleId): string {
  return MODULE_COLLECTION_MAP[moduleId];
}

export async function ensureWorkspaceInitialized(
  workspaceId: string,
  userDisplayName: string | null,
): Promise<void> {
  const wsRef = doc(db, 'workspaces', workspaceId);
  try {
    const wsSnap = await getDoc(wsRef);
    if (wsSnap.exists()) {
      return;
    }

    // Create parent workspace first to satisfy Master Gate exists() checks cleanly
    await setDoc(wsRef, {
      ownerId: workspaceId,
      name: userDisplayName ? `Tata Usaha · ${userDisplayName}` : 'Tata Usaha Sekolah',
      seeded: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const batch = writeBatch(db);

    const configRef = doc(db, 'workspaces', workspaceId, 'config', 'main');
    batch.set(configRef, {
      ownerId: workspaceId,
      kopSurat: DEFAULT_KOP_SURAT,
      dashboardConfig: DEFAULT_DASHBOARD_CONFIG,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    (Object.keys(DEFAULT_MODULE_CONFIGS) as ModuleId[]).forEach((modId) => {
      const modRef = doc(db, 'workspaces', workspaceId, 'moduleConfigs', modId);
      batch.set(modRef, {
        ...DEFAULT_MODULE_CONFIGS[modId],
        ownerId: workspaceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    SAMPLE_LETTERS.forEach((item) => {
      const ref = doc(collection(db, 'workspaces', workspaceId, 'letters'));
      batch.set(ref, {
        ...item,
        ownerId: workspaceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    SAMPLE_ASSETS.forEach((item) => {
      const ref = doc(collection(db, 'workspaces', workspaceId, 'assets'));
      batch.set(ref, {
        ...item,
        ownerId: workspaceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    SAMPLE_TEACHERS.forEach((item) => {
      const ref = doc(collection(db, 'workspaces', workspaceId, 'teachers'));
      batch.set(ref, {
        ...item,
        ownerId: workspaceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    SAMPLE_STUDENTS.forEach((item) => {
      const ref = doc(collection(db, 'workspaces', workspaceId, 'students'));
      batch.set(ref, {
        ...item,
        ownerId: workspaceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    SAMPLE_EMPLOYEES.forEach((item) => {
      const ref = doc(collection(db, 'workspaces', workspaceId, 'employees'));
      batch.set(ref, {
        ...item,
        ownerId: workspaceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${workspaceId}`);
  }
}

export async function saveKopSuratConfig(
  workspaceId: string,
  kopSurat: KopSuratConfig,
): Promise<void> {
  const path = `workspaces/${workspaceId}/config/main`;
  try {
    const ref = doc(db, 'workspaces', workspaceId, 'config', 'main');
    await updateDoc(ref, {
      kopSurat: {
        instansiInduk: kopSurat.instansiInduk.slice(0, 200),
        namaSekolah: kopSurat.namaSekolah.trim().slice(0, 200) || 'NAMA INSTANSI',
        subJudul: kopSurat.subJudul.slice(0, 240),
        alamat: kopSurat.alamat.slice(0, 300),
        kontak: kopSurat.kontak.slice(0, 240),
        kotaPenetapan: kopSurat.kotaPenetapan.slice(0, 100),
        namaKepala: kopSurat.namaKepala.slice(0, 140),
        nipKepala: kopSurat.nipKepala.slice(0, 60),
        jabatanKepala: kopSurat.jabatanKepala.slice(0, 120),
        namaKaTU: kopSurat.namaKaTU.slice(0, 140),
        nipKaTU: kopSurat.nipKaTU.slice(0, 60),
        logoUrl: kopSurat.logoUrl.slice(0, 250000),
        ukuranLogo: kopSurat.ukuranLogo,
        gayaGaris: kopSurat.gayaGaris,
        warnaAksen: kopSurat.warnaAksen.slice(0, 20),
        posisiTeks: kopSurat.posisiTeks,
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveDashboardConfig(
  workspaceId: string,
  dashboardConfig: DashboardConfig,
): Promise<void> {
  const path = `workspaces/${workspaceId}/config/main`;
  try {
    const ref = doc(db, 'workspaces', workspaceId, 'config', 'main');
    await updateDoc(ref, {
      dashboardConfig: {
        judul: dashboardConfig.judul.trim().slice(0, 160) || 'Dashboard Tata Usaha',
        subjudul: dashboardConfig.subjudul.slice(0, 240),
        tahunAjaran: dashboardConfig.tahunAjaran.trim().slice(0, 60) || '2026/2027',
        kepadatanTabel: dashboardConfig.kepadatanTabel,
        warnaTema: dashboardConfig.warnaTema,
        widgetTampil: dashboardConfig.widgetTampil.slice(0, 12),
        urutanModul: dashboardConfig.urutanModul.slice(0, 12),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveModuleConfig(
  workspaceId: string,
  moduleId: ModuleId,
  config: Omit<ModuleConfigDoc, 'ownerId' | 'createdAt' | 'updatedAt'>,
): Promise<void> {
  const path = `workspaces/${workspaceId}/moduleConfigs/${moduleId}`;
  try {
    const ref = doc(db, 'workspaces', workspaceId, 'moduleConfigs', moduleId);
    await updateDoc(ref, {
      displayName: config.displayName.trim().slice(0, 80) || DEFAULT_MODULE_CONFIGS[moduleId].displayName,
      hiddenColumns: config.hiddenColumns.slice(0, 30),
      columnLabels: config.columnLabels,
      selectOptions: config.selectOptions,
      customFields: config.customFields.slice(0, 20),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

function sanitizeRecordPayload(
  moduleId: ModuleId,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const schema = MODULE_BASE_FIELDS[moduleId];
  const clean: Record<string, unknown> = {};

  schema.forEach((field) => {
    const val = raw[field.key];
    if (field.type === 'number') {
      const num = typeof val === 'number' ? val : Number(val ?? 0);
      clean[field.key] = Number.isFinite(num) && num >= 0 ? num : 0;
    } else {
      const str = typeof val === 'string' ? val.trim().slice(0, field.maxLength) : '';
      if (field.required || str !== '') {
        clean[field.key] = str;
      } else {
        clean[field.key] = '';
      }
    }
  });

  if (raw.customValues && typeof raw.customValues === 'object') {
    const entries = Object.entries(raw.customValues as Record<string, unknown>).slice(0, 25);
    const cleanCustom: Record<string, string | number> = {};
    entries.forEach(([k, v]) => {
      if (typeof v === 'number' && Number.isFinite(v)) {
        cleanCustom[k.slice(0, 60)] = v;
      } else if (typeof v === 'string') {
        cleanCustom[k.slice(0, 60)] = v.slice(0, 300);
      }
    });
    clean.customValues = cleanCustom;
  }

  return clean;
}

export async function createModuleRecord(
  workspaceId: string,
  moduleId: ModuleId,
  data: Record<string, unknown>,
): Promise<string> {
  const colName = getModuleCollectionName(moduleId);
  const path = `workspaces/${workspaceId}/${colName}`;
  try {
    const clean = sanitizeRecordPayload(moduleId, data);
    const docRef = await addDoc(collection(db, 'workspaces', workspaceId, colName), {
      ...clean,
      ownerId: workspaceId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function batchCreateModuleRecords(
  workspaceId: string,
  moduleId: ModuleId,
  rows: Record<string, unknown>[],
): Promise<number> {
  const colName = getModuleCollectionName(moduleId);
  const path = `workspaces/${workspaceId}/${colName}`;
  const CHUNK_SIZE = 400;
  let importedCount = 0;

  try {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((raw) => {
        const clean = sanitizeRecordPayload(moduleId, raw);
        const ref = doc(collection(db, 'workspaces', workspaceId, colName));
        batch.set(ref, {
          ...clean,
          ownerId: workspaceId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      importedCount += chunk.length;
    }
    return importedCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateModuleRecord(
  workspaceId: string,
  moduleId: ModuleId,
  recordId: string,
  data: Record<string, unknown>,
  previousStatus?: string,
): Promise<void> {
  const colName = getModuleCollectionName(moduleId);
  const path = `workspaces/${workspaceId}/${colName}/${recordId}`;
  try {
    const ref = doc(db, 'workspaces', workspaceId, colName, recordId);
    const clean = sanitizeRecordPayload(moduleId, data);

    // Respect Terminal State Locking for archived letters unless explicitly unarchiving
    if (moduleId === 'persuratan' && previousStatus === 'Diarsipkan' && clean.status !== 'Diarsipkan') {
      await updateDoc(ref, {
        status: clean.status,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await updateDoc(ref, {
      ...clean,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteModuleRecord(
  workspaceId: string,
  moduleId: ModuleId,
  recordId: string,
): Promise<void> {
  const colName = getModuleCollectionName(moduleId);
  const path = `workspaces/${workspaceId}/${colName}/${recordId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', workspaceId, colName, recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function reseedModuleSampleData(
  workspaceId: string,
  moduleId: ModuleId,
): Promise<void> {
  const colName = getModuleCollectionName(moduleId);
  const path = `workspaces/${workspaceId}/${colName}`;
  try {
    const existingSnap = await getDocs(collection(db, 'workspaces', workspaceId, colName));
    const batch = writeBatch(db);
    existingSnap.docs.forEach((d) => batch.delete(d.ref));

    const samples =
      moduleId === 'persuratan'
        ? SAMPLE_LETTERS
        : moduleId === 'aset'
          ? SAMPLE_ASSETS
          : moduleId === 'guru'
            ? SAMPLE_TEACHERS
            : moduleId === 'siswa'
              ? SAMPLE_STUDENTS
              : SAMPLE_EMPLOYEES;

    samples.forEach((item) => {
      const ref = doc(collection(db, 'workspaces', workspaceId, colName));
      batch.set(ref, {
        ...item,
        ownerId: workspaceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
