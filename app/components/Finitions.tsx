"use client";

type NotificationProps = {
  message: string;
  visible: boolean;
};

export default function Notification({
  message,
  visible,
}: NotificationProps) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-[100] w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-green-400/40 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl transition duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-8 opacity-0"
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500/20 text-2xl">
          ✅
        </span>

        <div>
          <p className="font-black text-white">
            Carte ajoutée !
          </p>

          <p className="mt-1 text-sm text-slate-300">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}