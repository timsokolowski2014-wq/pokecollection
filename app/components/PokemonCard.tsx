"use client";

import { useState } from "react";

type PokemonCardProps = {
  nom: string;
  edition: string;
  type: string;
  etat: string;
  prix: number;
  image: string;
  selectionnee: boolean;
  onSelectionner: () => void;
};

const typesPokemon: Record<
  string,
  {
    emoji: string;
    couleur: string;
  }
> = {
  Feu: { emoji: "🔥", couleur: "bg-red-500" },
  Eau: { emoji: "💧", couleur: "bg-blue-500" },
  Plante: { emoji: "🌿", couleur: "bg-green-500" },
  Électrique: { emoji: "⚡", couleur: "bg-yellow-400 text-black" },
  Psy: { emoji: "🔮", couleur: "bg-pink-500" },
  Combat: { emoji: "👊", couleur: "bg-orange-700" },
  Dragon: { emoji: "🐉", couleur: "bg-purple-600" },
  Fée: { emoji: "🧚", couleur: "bg-pink-300 text-black" },
  Glace: { emoji: "❄️", couleur: "bg-cyan-300 text-black" },
  Insecte: { emoji: "🐛", couleur: "bg-lime-600" },
  Métal: { emoji: "⚙️", couleur: "bg-gray-500" },
  Poison: { emoji: "☠️", couleur: "bg-purple-800" },
  Roche: { emoji: "🪨", couleur: "bg-stone-600" },
  Spectre: { emoji: "👻", couleur: "bg-indigo-800" },
  Ténèbres: { emoji: "🌑", couleur: "bg-black" },
  Vol: { emoji: "🪽", couleur: "bg-sky-500" },
  Incolore: { emoji: "⭐", couleur: "bg-gray-300 text-black" },
};

export default function PokemonCard({
  nom,
  edition,
  type,
  etat,
  prix,
  image,
  selectionnee,
  onSelectionner,
}: PokemonCardProps) {
  const [imageAgrandie, setImageAgrandie] = useState(false);

  const informationsType = typesPokemon[type] ?? {
    emoji: "🏷️",
    couleur: "bg-slate-600",
  };

  return (
    <>
      <div
        className={`rounded-3xl border bg-slate-800 p-5 shadow-xl transition ${
          selectionnee
            ? "border-yellow-400 ring-2 ring-yellow-400"
            : "border-slate-700"
        }`}
      >
        <div className="mb-4 flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={selectionnee}
            onChange={onSelectionner}
            className="h-5 w-5 cursor-pointer accent-yellow-400"
          />

          <span>Sélectionner</span>
        </div>

        <div className="flex items-center gap-5">
          {/* Informations */}
          <div className="min-w-0 flex-1">
            <h3 className="mb-2 text-2xl font-bold">
              {nom}
            </h3>

            <p className="mb-2 text-gray-300">
              📚 {edition}
            </p>

            <span
              className={`mb-3 inline-block rounded-full px-3 py-1 font-semibold ${informationsType.couleur}`}
            >
              {informationsType.emoji} {type}
            </span>

            <p className="mb-2">
              ⭐ État : {etat}
            </p>

            <p className="text-xl font-bold text-yellow-400">
              💰 {prix.toFixed(2)} €
            </p>
          </div>

          {/* Photo */}
          <div className="w-32 flex-shrink-0">
            {image ? (
              <button
                type="button"
                onClick={() => setImageAgrandie(true)}
                className="block w-full cursor-zoom-in"
              >
                <img
                  src={image}
                  alt={`Carte Pokémon ${nom}`}
                  className="h-44 w-full rounded-xl object-contain transition hover:scale-105"
                />
              </button>
            ) : (
              <div className="flex h-44 items-center justify-center rounded-xl bg-slate-700 p-2 text-center text-sm text-gray-400">
                Aucune photo
              </div>
            )}
          </div>
        </div>
      </div>

      {imageAgrandie && image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImageAgrandie(false)}
        >
          <button
            type="button"
            onClick={() => setImageAgrandie(false)}
            className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-xl font-bold text-black hover:bg-gray-200"
          >
            ✕
          </button>

          <img
            src={image}
            alt={`Carte Pokémon ${nom} agrandie`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}