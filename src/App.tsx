import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  Briefcase,
  Building2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  SlidersHorizontal,
  Stamp,
  Users,
  X,
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { DashboardView } from './components/DashboardView';
import { DatabaseModuleView } from './components/DatabaseModuleView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImportDataView } from './components/ImportDataView';
import { KopSettingsView } from './components/KopSettingsView';
import { WorkspaceCustomizerView } from './components/WorkspaceCustomizerView';
import {
  ADMIN_AVATAR_PATH,
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_KOP_SURAT,
  DEFAULT_MODULE_CONFIGS,
} from './lib/defaults';
import { auth, db, handleFirestoreError } from './lib/firebase';
import { ensureWorkspaceInitialized } from './lib/firestoreService';
import {
  AssetRecord,
  DashboardConfig,
  EmployeeRecord,
  KopSuratConfig,
  LetterRecord,
  ModuleConfigDoc,
  ModuleId,
  OperationType,
  StudentRecord,
  TeacherRecord,
  ViewRoute,
} from './types/database';

function buildDefaultModuleConfigMap(ownerId: string): Record<ModuleId, ModuleConfigDoc> {
  return {
    persuratan: { ...DEFAULT_MODULE_CONFIGS.persuratan, ownerId },
    aset: { ...DEFAULT_MODULE_CONFIGS.aset, ownerId },
    guru: { ...DEFAULT_MODULE_CONFIGS.guru, ownerId },
    siswa: { ...DEFAULT_MODULE_CONFIGS.siswa, ownerId },
    karyawan: { ...DEFAULT_MODULE_CONFIGS.karyawan, ownerId },
  };
}

const MODULE_ICONS: Record<ModuleId, React.ReactNode> = {
  persuratan: <FileText className="w-4 h-4 shrink-0" />,
  aset: <Package className="w-4 h-4 shrink-0" />,
  guru: <GraduationCap className="w-4 h-4 shrink-0" />,
  siswa: <Users className="w-4 h-4 shrink-0" />,
  karyawan: <Briefcase className="w-4 h-4 shrink-0" />,
};

function MainApplication() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const [activeView, setActiveView] = useState<ViewRoute>('dashboard');
  const [customizerInitialTab, setCustomizerInitialTab] = useState<'dashboard' | 'database'>('dashboard');
  const [customizerInitialMod, setCustomizerInitialMod] = useState<ModuleId>('persuratan');
  const [importInitialTarget, setImportInitialTarget] = useState<'siswa' | 'guru' | 'karyawan'>('siswa');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const [kopSurat, setKopSurat] = useState<KopSuratConfig>(DEFAULT_KOP_SURAT);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG);
  const [moduleConfigs, setModuleConfigs] = useState<Record<ModuleId, ModuleConfigDoc>>(
    buildDefaultModuleConfigMap(''),
  );

  const [letters, setLetters] = useState<LetterRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setDataLoading(true);
        await ensureWorkspaceInitialized(nextUser.uid, nextUser.displayName);
        setWorkspaceReady(true);
      } else {
        setWorkspaceReady(false);
        setDataLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !workspaceReady) return;
    const uid = user.uid;

    const unsubs: (() => void)[] = [];

    const configPath = `workspaces/${uid}/config/main`;
    unsubs.push(
      onSnapshot(
        doc(db, 'workspaces', uid, 'config', 'main'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.kopSurat) setKopSurat(data.kopSurat as KopSuratConfig);
            if (data.dashboardConfig) setDashboardConfig(data.dashboardConfig as DashboardConfig);
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, configPath),
      ),
    );

    const modConfigPath = `workspaces/${uid}/moduleConfigs`;
    unsubs.push(
      onSnapshot(
        collection(db, 'workspaces', uid, 'moduleConfigs'),
        (snap) => {
          const next = buildDefaultModuleConfigMap(uid);
          snap.docs.forEach((d) => {
            const data = d.data() as ModuleConfigDoc;
            if (data.moduleId && next[data.moduleId]) {
              next[data.moduleId] = data;
            }
          });
          setModuleConfigs(next);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, modConfigPath),
      ),
    );

    const attachList = <T,>(
      colName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      onLoaded?: () => void,
    ) => {
      const path = `workspaces/${uid}/${colName}`;
      const q = query(collection(db, 'workspaces', uid, colName), orderBy('createdAt', 'desc'));
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
            setter(items);
            if (onLoaded) onLoaded();
          },
          (err) => handleFirestoreError(err, OperationType.LIST, path),
        ),
      );
    };

    attachList<LetterRecord>('letters', setLetters, () => setDataLoading(false));
    attachList<AssetRecord>('assets', setAssets);
    attachList<TeacherRecord>('teachers', setTeachers);
    attachList<StudentRecord>('students', setStudents);
    attachList<EmployeeRecord>('employees', setEmployees);

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, user, workspaceReady]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xs font-medium text-slate-500">Memuat SINTATA...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  const navigateTo = (view: ViewRoute) => {
    if (view === 'pengaturan-db') {
      setCustomizerInitialTab('dashboard');
    }
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const openModuleCustomizer = (modId: ModuleId) => {
    setCustomizerInitialTab('database');
    setCustomizerInitialMod(modId);
    setActiveView('pengaturan-db');
  };

  const openModuleImport = (modId: 'siswa' | 'guru' | 'karyawan') => {
    setImportInitialTarget(modId);
    setActiveView('import-data');
    setMobileMenuOpen(false);
  };

  const getActiveRecords = (modId: ModuleId) => {
    if (modId === 'persuratan') return letters;
    if (modId === 'aset') return assets;
    if (modId === 'guru') return teachers;
    if (modId === 'siswa') return students;
    return employees;
  };

  const getCountForModule = (modId: ModuleId): number => getActiveRecords(modId).length;

  const currentPageLabel =
    activeView === 'dashboard'
      ? 'Dashboard'
      : activeView === 'import-data'
        ? 'Import Data Massal'
        : activeView === 'kop-surat'
          ? 'Set Kop Surat'
          : activeView === 'pengaturan-db'
            ? 'Ubah Dashboard & Database'
            : moduleConfigs[activeView]?.displayName || activeView;

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-slate-900 text-slate-100">
      <div className="p-5 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
            {kopSurat.logoUrl && !logoFailed ? (
              <img
                src={kopSurat.logoUrl}
                alt="Logo Instansi"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-7 h-7 object-contain"
              />
            ) : (
              <Building2 className="w-5 h-5 text-slate-800" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold tracking-tight text-white truncate">
              SINTATA
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {kopSurat.namaSekolah}
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-white text-slate-900'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5 truncate">
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="truncate">Dashboard Utama</span>
            </span>
          </button>

          <div className="pt-4 pb-1 px-3">
            <p className="text-[11px] font-medium text-slate-400">Modul Database</p>
          </div>

          {dashboardConfig.urutanModul.map((modId) => {
            const label = moduleConfigs[modId]?.displayName || modId;
            const active = activeView === modId;
            return (
              <button
                key={modId}
                type="button"
                onClick={() => navigateTo(modId)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {MODULE_ICONS[modId]}
                  <span className="truncate">{label}</span>
                </span>
                <span
                  className={`font-mono tabular-nums text-[11px] shrink-0 ${
                    active ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {getCountForModule(modId)}
                </span>
              </button>
            );
          })}

          <div className="pt-4 pb-1 px-3">
            <p className="text-[11px] font-medium text-slate-400">Kustomisasi</p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('import-data')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeView === 'import-data'
                ? 'bg-white text-slate-900'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span className="truncate">Import Data</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('kop-surat')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeView === 'kop-surat'
                ? 'bg-white text-slate-900'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Stamp className="w-4 h-4 shrink-0" />
            <span className="truncate">Set Kop Surat</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('pengaturan-db')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeView === 'pengaturan-db'
                ? 'bg-white text-slate-900'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span className="truncate">Ubah Dashboard &amp; DB</span>
          </button>
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-800 shrink-0">
            {!avatarFailed ? (
              <img
                src={user.photoURL || ADMIN_AVATAR_PATH}
                alt={user.displayName || 'Admin Tata Usaha'}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
                TU
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user.displayName || 'Administrator TU'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Akun</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="w-72 h-full relative z-10">{sidebarContent}</div>
          <div
            className="flex-1 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white rounded-lg text-slate-900 z-20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract (3 zones) */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-slate-900 whitespace-nowrap truncate">
              {currentPageLabel}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => navigateTo('persuratan')}
              className="hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Persuratan
            </button>
            <button
              type="button"
              onClick={() => navigateTo('aset')}
              className="hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Aset
            </button>
            <button
              type="button"
              onClick={() => navigateTo('guru')}
              className="hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Guru
            </button>
            <button
              type="button"
              onClick={() => navigateTo('siswa')}
              className="hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Siswa
            </button>
            <button
              type="button"
              onClick={() => navigateTo('karyawan')}
              className="hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Karyawan
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('kop-surat')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Set Kop Surat
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-[1440px] w-full mx-auto">
          {activeView === 'dashboard' && (
            <DashboardView
              dashboardConfig={dashboardConfig}
              kopSurat={kopSurat}
              moduleConfigs={moduleConfigs}
              letters={letters}
              assets={assets}
              teachers={teachers}
              students={students}
              employees={employees}
              onNavigate={navigateTo}
              loading={dataLoading}
            />
          )}

          {(activeView === 'persuratan' ||
            activeView === 'aset' ||
            activeView === 'guru' ||
            activeView === 'siswa' ||
            activeView === 'karyawan') && (
            <DatabaseModuleView
              workspaceId={user.uid}
              moduleId={activeView}
              moduleConfig={moduleConfigs[activeView]}
              dashboardConfig={dashboardConfig}
              kopSurat={kopSurat}
              records={getActiveRecords(activeView)}
              loading={dataLoading}
              onOpenCustomizer={openModuleCustomizer}
              onOpenImport={
                activeView === 'siswa' || activeView === 'guru' || activeView === 'karyawan'
                  ? () => openModuleImport(activeView)
                  : undefined
              }
              onNotify={showToast}
            />
          )}

          {activeView === 'import-data' && (
            <ImportDataView
              workspaceId={user.uid}
              initialTarget={importInitialTarget}
              moduleConfigs={moduleConfigs}
              onNavigateToModule={(mod) => navigateTo(mod)}
              onNotify={showToast}
            />
          )}

          {activeView === 'kop-surat' && (
            <KopSettingsView
              workspaceId={user.uid}
              kopSurat={kopSurat}
              onNotify={showToast}
            />
          )}

          {activeView === 'pengaturan-db' && (
            <WorkspaceCustomizerView
              workspaceId={user.uid}
              dashboardConfig={dashboardConfig}
              moduleConfigs={moduleConfigs}
              initialTab={customizerInitialTab}
              initialModule={customizerInitialMod}
              onNotify={showToast}
            />
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-700 text-xs font-medium shadow-lg no-print">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApplication />
    </ErrorBoundary>
  );
}
