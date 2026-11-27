import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isQuotaError: boolean;
  isPermissionError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isQuotaError: false,
      isPermissionError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error.message || 'Terjadi kesalahan pada aplikasi.';
    let parsedMessage = raw;
    let isPermissionError = raw.includes('Missing or insufficient permissions') || raw.includes('PERMISSION_DENIED');
    const isQuotaError = raw.includes('Quota exceeded');

    try {
      const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        parsedMessage = `${parsed.error} (${parsed.operationType || 'operasi'} pada ${parsed.path || 'database'})`;
        if (parsed.error.includes('permissions')) {
          isPermissionError = true;
        }
      }
    } catch {
      // Plain error message
    }

    return {
      hasError: true,
      errorMessage: parsedMessage,
      isQuotaError,
      isPermissionError,
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold text-slate-900">
                {this.state.isQuotaError
                  ? 'Kuota Database Tercapai'
                  : this.state.isPermissionError
                    ? 'Akses Database Ditolak'
                    : 'Gangguan Sistem Database'}
              </h1>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {this.state.isQuotaError
                ? 'Batas pembacaan/penulisan harian Firestore gratis telah tercapai dan akan direset keesokan harinya.'
                : this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
