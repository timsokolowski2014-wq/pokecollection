"use client";

import { useState } from "react";

type HeaderPokemonProps = {
  totalCartes: number;
  valeurCollection: number;
};

export default function HeaderPokemon({
  totalCartes,
  valeurCollection,
}: HeaderPokemonProps) {
  const [logoDisponible, setLogoDisponible] = useState(true);

  return (
    <header className="relative mb-12 overflow-hidden rounded-3xl border border-blue-400/30 bg-slate-900/80 px-6 py-8 shadow-2xl backdrop-blur-xl sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-44 w-44 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-7 text-center lg:flex-row lg:justify-between lg:text-left">
        <div className="flex flex-col items-center gap-5 sm:flex-row lg:items-center">
          <div className="flex h-28 w-48 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner sm:h-32 sm:w-56">
            {logoDisponible ? (
              <img
                src="/pokemon-logo.png"
                alt="Logo Pokémon"
                className="max-h-full max-w-full object-contain"
                onError={() => setLogoDisponible(false)}
              />
            ) : (
              <div
                aria-label="Pokémon"
                className="select-none text-4xl font-black tracking-tight text-yellow-300"
                style={{
                  WebkitTextStroke: "2px #2563eb",
                  textShadow:
                    "0 3px 0 #1e3a8a, 0 7px 16px rgba(37,99,235,.45)",
                }}
              >
                Pokémon
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.28em] text-blue-300">
              Ma collection de cartes
            </p>

            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
              Poké
              <span className="text-yellow-300">Collection</span>
            </h1>

            <p className="mt-3 max-w-2xl text-base text-slate-300 sm:text-lg">
              Gère tes cartes, suis leur prix et observe l’évolution de ta
              collection.
            </p>
          </div>
        </div>

        <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2 lg:w-auto">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-6 py-5 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-200">
              Cartes
            </p>

            <p className="mt-2 text-4xl font-black text-white">
              {totalCartes}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-300/20 bg-yellow-400/10 px-6 py-5 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-yellow-200">
              Valeur totale
            </p>

            <p className="mt-2 text-4xl font-black text-yellow-300">
              {valeurCollection.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}