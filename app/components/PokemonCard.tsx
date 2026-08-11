"use client";

type PokemonCardProps = {
  nom: string;
  edition: string;
  type: string;
  etat: string;
  prix: number;
  quantite?: number;
  image: string;
  historique?: { prix: number; date: string }[];
  selectionnee?: boolean;
  onSelectionner?: () => void;
  onVoirGraphique?: () => void;
  onModifier?: () => void;
  onSupprimer?: () => void;
  onAgrandir?: () => void;
  favori?: boolean;
  onFavori?: () => void;
};

const couleursTypes: Record<
  string,
  {
    fond: string;
    texte: string;
    emoji: string;
    bordure: string;
    lueur: string;
  }
> = {
  Feu: {
    fond: "bg-red-500/20",
    texte: "text-red-200",
    emoji: "🔥",
    bordure: "border-red-400/40",
    lueur: "group-hover:shadow-red-950/40",
  },
  Eau: {
    fond: "bg-blue-500/20",
    texte: "text-blue-200",
    emoji: "💧",
    bordure: "border-blue-400/40",
    lueur: "group-hover:shadow-blue-950/40",
  },
  Plante: {
    fond: "bg-green-500/20",
    texte: "text-green-200",
    emoji: "🌿",
    bordure: "border-green-400/40",
    lueur: "group-hover:shadow-green-950/40",
  },
  Électrique: {
    fond: "bg-yellow-400/20",
    texte: "text-yellow-200",
    emoji: "⚡",
    bordure: "border-yellow-300/40",
    lueur: "group-hover:shadow-yellow-950/30",
  },
  Psy: {
    fond: "bg-pink-500/20",
    texte: "text-pink-200",
    emoji: "🧠",
    bordure: "border-pink-400/40",
    lueur: "group-hover:shadow-pink-950/40",
  },
  Combat: {
    fond: "bg-orange-500/20",
    texte: "text-orange-200",
    emoji: "🥊",
    bordure: "border-orange-400/40",
    lueur: "group-hover:shadow-orange-950/40",
  },
  Dragon: {
    fond: "bg-indigo-500/20",
    texte: "text-indigo-200",
    emoji: "🐉",
    bordure: "border-indigo-400/40",
    lueur: "group-hover:shadow-indigo-950/40",
  },
  Glace: {
    fond: "bg-cyan-400/20",
    texte: "text-cyan-100",
    emoji: "❄️",
    bordure: "border-cyan-300/40",
    lueur: "group-hover:shadow-cyan-950/40",
  },
  Ténèbres: {
    fond: "bg-slate-500/20",
    texte: "text-slate-200",
    emoji: "🌑",
    bordure: "border-slate-400/40",
    lueur: "group-hover:shadow-slate-950/50",
  },
  Métal: {
    fond: "bg-gray-400/20",
    texte: "text-gray-200",
    emoji: "⚙️",
    bordure: "border-gray-300/40",
    lueur: "group-hover:shadow-gray-950/40",
  },
  Fée: {
    fond: "bg-rose-400/20",
    texte: "text-rose-100",
    emoji: "🧚",
    bordure: "border-rose-300/40",
    lueur: "group-hover:shadow-rose-950/40",
  },
  Roche: {
    fond: "bg-amber-500/20",
    texte: "text-amber-200",
    emoji: "🪨",
    bordure: "border-amber-400/40",
    lueur: "group-hover:shadow-amber-950/40",
  },
  Sol: {
    fond: "bg-yellow-700/20",
    texte: "text-yellow-100",
    emoji: "🌍",
    bordure: "border-yellow-600/40",
    lueur: "group-hover:shadow-yellow-950/40",
  },
  Poison: {
    fond: "bg-purple-500/20",
    texte: "text-purple-200",
    emoji: "☠️",
    bordure: "border-purple-400/40",
    lueur: "group-hover:shadow-purple-950/40",
  },
  Spectre: {
    fond: "bg-violet-500/20",
    texte: "text-violet-200",
    emoji: "👻",
    bordure: "border-violet-400/40",
    lueur: "group-hover:shadow-violet-950/40",
  },
  Insecte: {
    fond: "bg-lime-500/20",
    texte: "text-lime-200",
    emoji: "🐛",
    bordure: "border-lime-400/40",
    lueur: "group-hover:shadow-lime-950/40",
  },
  Vol: {
    fond: "bg-sky-500/20",
    texte: "text-sky-200",
    emoji: "🕊️",
    bordure: "border-sky-400/40",
    lueur: "group-hover:shadow-sky-950/40",
  },
  Incolore: {
    fond: "bg-white/10",
    texte: "text-white",
    emoji: "⭐",
    bordure: "border-white/20",
    lueur: "group-hover:shadow-black/40",
  },
};

export default function PokemonCard({
  nom,
  edition,
  type,
  etat,
  prix,
  quantite = 1,
  image,
  selectionnee = false,
  onSelectionner,
  onVoirGraphique,
  onModifier,
  onSupprimer,
  onAgrandir,
  favori = false,
  onFavori,
}: PokemonCardProps) {
  const couleur = couleursTypes[type] ?? {
    fond: "bg-slate-500/20",
    texte: "text-slate-200",
    emoji: "❔",
    bordure: "border-slate-400/40",
    lueur: "group-hover:shadow-slate-950/40",
  };

  return (
    <article
      onClick={onAgrandir}
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-slate-900/90 p-4 shadow-xl sm:p-5 backdrop-blur-xl transition duration-300 ${
        onAgrandir
          ? "cursor-pointer hover:-translate-y-2 hover:scale-[1.01] hover:shadow-2xl"
          : ""
      } ${
        selectionnee
          ? "border-blue-400 ring-2 ring-blue-400/70"
          : couleur.bordure
      } ${couleur.lueur}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-60" />
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${couleur.fond}`}
      />

      <div className="relative z-10 mb-5 flex items-center gap-3">
        {onSelectionner && (
          <label
            className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl bg-slate-950/60 px-3 py-2 text-sm font-bold text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selectionnee}
              onChange={onSelectionner}
              className="h-5 w-5 accent-blue-500"
            />

            {selectionnee ? "Sélectionnée" : "Sélectionner"}
          </label>
        )}

        {onFavori && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFavori();
            }}
            aria-label={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
            title={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl transition ${
              favori
                ? "border-yellow-300/70 bg-yellow-400/20 text-yellow-300 shadow-lg shadow-yellow-950/30"
                : "border-slate-600 bg-slate-950/60 text-slate-400 hover:border-yellow-300/60 hover:text-yellow-300"
            }`}
          >
            {favori ? "★" : "☆"}
          </button>
        )}
      </div>

      <div className="relative z-10 grid flex-1 gap-5 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Carte Pokémon
          </p>

          <h3 className="mt-2 text-xl font-black leading-tight text-white sm:text-3xl">
            {nom}
          </h3>

          <div className="mt-5 space-y-3 text-base text-slate-300">
            <p className="flex items-start gap-2">
              <span>🗂️</span>
              <span>{edition}</span>
            </p>

            <p className="flex items-start gap-2">
              <span>⭐</span>
              <span>{etat}</span>
            </p>
          </div>

          <p className="mt-5 text-3xl font-black text-yellow-300">
            {Number(prix).toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            €
          </p>

          {quantite > 1 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm font-black text-amber-200">
              <span>×{quantite}</span>
              <span>
                {quantite === 2
                  ? "Carte en double"
                  : quantite === 3
                    ? "Carte en triple"
                    : `${quantite} exemplaires`}
              </span>
            </div>
          )}

          <span
            className={`mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${couleur.fond} ${couleur.texte} ${couleur.bordure}`}
          >
            {couleur.emoji} {type}
          </span>
        </div>

        <div className="flex w-full items-start justify-center sm:w-auto">
          {image ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-lg">
              <img
                src={image}
                alt={nom}
                className="h-auto max-h-[26rem] w-full max-w-[18rem] rounded-xl object-contain transition duration-300 group-hover:scale-105 sm:h-72 sm:w-48"
              />
            </div>
          ) : (
            <div className="flex h-64 w-44 items-center justify-center rounded-2xl border border-slate-600 bg-slate-800 text-center text-sm text-slate-400">
              Image indisponible
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-7 grid gap-3">
        {onVoirGraphique && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVoirGraphique();
            }}
            className="w-full rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 font-bold text-blue-100 transition hover:border-blue-300/70 hover:bg-blue-500/20"
          >
            📈 Voir l&apos;évolution du prix
          </button>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {onModifier && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onModifier();
              }}
              className="rounded-xl border border-orange-400/30 bg-orange-500/15 px-4 py-3 text-sm font-bold text-orange-100 transition hover:border-orange-300/70 hover:bg-orange-500/25"
            >
              ✏️ Modifier
            </button>
          )}

          {onSupprimer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSupprimer();
              }}
              className="rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100 transition hover:border-red-300/70 hover:bg-red-500/25"
            >
              🗑️ Supprimer
            </button>
          )}
        </div>
      </div>
    </article>
  );
}