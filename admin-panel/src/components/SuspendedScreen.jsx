export default function SuspendedScreen() {
  return (
    <div className="min-h-screen bg-[#080d17] flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-xs">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ef4444" viewBox="0 0 256 256">
            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-3">Cuenta Suspendida</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-5">
          Este local se encuentra temporalmente suspendido.<br />
          Contacta al administrador para más información.
        </p>
        <div className="px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/15 text-sm text-red-400 font-medium">
          Estado: Suspendido · Acceso bloqueado
        </div>
      </div>
    </div>
  );
}
