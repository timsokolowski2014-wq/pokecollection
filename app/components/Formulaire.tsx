import { useState } from "react";

type FormulaireProps = {
  nom: string;
  setNom: (value: string) => void;

  edition: string;
  setEdition: (value: string) => void;

  type: string;
  setType: (value: string) => void;

  etat: string;
  setEtat: (value: string) => void;

  prix: string;
  setPrix: (value: string) => void;

  image: string;
  setImage: (value: string) => void;

  numero: string;
  setNumero: (value: string) => void;

  idApi: string;
  setIdApi: (value: string) => void;

  onEnregistrer: () => void;
};

type CarteRecherche = {
  id: string;
  localId: string;
  name: string;
  image?: string;
};

type PrixCardmarket = {
  updated?: string;
  unit?: string;
  avg?: number;
  low?: number;
  trend?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
  "avg-holo"?: number;
  "low-holo"?: number;
  "trend-holo"?: number;
  "avg1-holo"?: number;
  "avg7-holo"?: number;
  "avg30-holo"?: number;
};

type CarteComplete = {
  id: string;
  localId: string;
  name: string;
  image?: string;
  rarity?: string;
  category?: string;
  types?: string[];

  set?: {
    name?: string;
    cardCount?: {
      official?: number;
      total?: number;
    };
  };

  pricing?: {
    cardmarket?: PrixCardmarket;
  };
};

export default function Formulaire({
  nom,
  setNom,
  edition,
  setEdition,
  numero,
  setNumero,
  idApi,
  setIdApi,
  type,
  setType,
  etat,
  setEtat,
  prix,
  setPrix,
  image,
  setImage,
  onEnregistrer,
}: FormulaireProps) {
  const [resultats, setResultats] = useState<CarteRecherche[]>([]);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [carteEnCours, setCarteEnCours] = useState("");
  const [erreurRecherche, setErreurRecherche] = useState("");

  function convertirType(typeApi?: string) {
    const types: Record<string, string> = {
      Fire: "Feu",
      Water: "Eau",
      Grass: "Plante",
      Lightning: "Électrique",
      Psychic: "Psy",
      Fighting: "Combat",
      Dragon: "Dragon",
      Fairy: "Fée",
      Metal: "Métal",
      Darkness: "Ténèbres",
      Colorless: "Incolore",
    };

    if (!typeApi) {
      return "";
    }

    return types[typeApi] ?? typeApi;
  }

  function obtenirNumeroRecherche() {
    return numero.trim().split("/")[0].trim().toLowerCase();
  }

  function obtenirPrixCardmarket(carte: CarteComplete) {
    const cardmarket = carte.pricing?.cardmarket;

    if (!cardmarket) {
      return undefined;
    }

    return (
      cardmarket.trend ??
      cardmarket.avg ??
      cardmarket.avg7 ??
      cardmarket.avg30 ??
      cardmarket["trend-holo"] ??
      cardmarket["avg-holo"] ??
      cardmarket["avg7-holo"] ??
      cardmarket["avg30-holo"]
    );
  }

  async function rechercherCarte() {
    if (!nom.trim()) {
      setErreurRecherche("Écris d’abord le nom de la carte.");
      setResultats([]);
      return;
    }

    setRechercheEnCours(true);
    setErreurRecherche("");
    setResultats([]);

    try {
      const adresse =
        "https://api.tcgdex.net/v2/fr/cards?name=" +
        encodeURIComponent(nom.trim());

      const reponse = await fetch(adresse);

      if (!reponse.ok) {
        throw new Error("La recherche a échoué.");
      }

      const cartesTrouvees: CarteRecherche[] = await reponse.json();
      const numeroRecherche = obtenirNumeroRecherche();

      const cartesFiltrees = numeroRecherche
        ? cartesTrouvees.filter((carte) =>
            String(carte.localId)
              .toLowerCase()
              .includes(numeroRecherche)
          )
        : cartesTrouvees;

      setResultats(cartesFiltrees.slice(0, 30));

      if (cartesFiltrees.length === 0) {
        setErreurRecherche(
          "Aucune carte trouvée. Vérifie le nom ou essaie sans le numéro."
        );
      }
    } catch (error) {
      console.error(error);
      setErreurRecherche(
        "Impossible de rechercher les cartes pour le moment."
      );
    } finally {
      setRechercheEnCours(false);
    }
  }

  async function choisirCarte(carte: CarteRecherche) {
    setCarteEnCours(carte.id);
    setErreurRecherche("");

    try {
      const reponse = await fetch(
        `https://api.tcgdex.net/v2/fr/cards/${encodeURIComponent(carte.id)}`
      );

      if (!reponse.ok) {
        throw new Error("Impossible de récupérer les détails.");
      }

      const carteComplete: CarteComplete = await reponse.json();

      setNom(carteComplete.name);
      setEdition(carteComplete.set?.name ?? "");
      setIdApi(carteComplete.id);
      setType(convertirType(carteComplete.types?.[0]));

      const total =
        carteComplete.set?.cardCount?.official ??
        carteComplete.set?.cardCount?.total;

      setNumero(
        total
          ? `${carteComplete.localId}/${total}`
          : String(carteComplete.localId)
      );

      if (carteComplete.image) {
        setImage(`${carteComplete.image}/high.webp`);
      } else {
        setImage("");
      }

      const prixTrouve = obtenirPrixCardmarket(carteComplete);

      if (typeof prixTrouve === "number") {
        setPrix(prixTrouve.toFixed(2));
      }

      setResultats([]);
    } catch (error) {
      console.error(error);
      setErreurRecherche(
        "Impossible de récupérer les informations de cette carte."
      );
    } finally {
      setCarteEnCours("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
      <h2 className="mb-2 text-4xl font-bold">
        ➕ Ajouter une carte
      </h2>

      <p className="mb-8 text-gray-400">
        Remplis les informations ou recherche une carte Pokémon.
      </p>

      <div className="space-y-6">
        <div>
          <label className="mb-2 block font-semibold">
            📛 Nom de la carte
          </label>

          <input
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Ex : Pikachu ex"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block font-semibold">
            🔢 Numéro de la carte
          </label>

          <input
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Exemple : 238/191"
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
          />

          <p className="mt-2 text-sm text-gray-400">
            Le numéro est facultatif, mais il aide à trouver la bonne carte.
          </p>
        </div>

        <button
          type="button"
          onClick={rechercherCarte}
          disabled={rechercheEnCours}
          className="w-full rounded-xl bg-blue-600 p-4 text-lg font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {rechercheEnCours
            ? "🔄 Recherche en cours..."
            : "🔍 Rechercher la carte"}
        </button>

        {erreurRecherche && (
          <p className="rounded-xl bg-red-950 p-3 text-red-300">
            {erreurRecherche}
          </p>
        )}

        {resultats.length > 0 && (
          <div className="rounded-2xl border border-slate-600 bg-slate-900 p-4">
            <h3 className="mb-4 text-xl font-bold">
              Résultats trouvés : {resultats.length}
            </h3>

            <div className="grid max-h-[600px] grid-cols-2 gap-4 overflow-y-auto sm:grid-cols-3">
              {resultats.map((carte) => (
                <button
                  key={carte.id}
                  type="button"
                  onClick={() => choisirCarte(carte)}
                  disabled={carteEnCours === carte.id}
                  className="rounded-xl border border-slate-600 bg-slate-800 p-3 text-left transition hover:border-yellow-400 hover:bg-slate-700 disabled:opacity-60"
                >
                  {carte.image ? (
  <img
    src={`${carte.image}/low.webp`}
    alt={carte.name}
    className="mx-auto mb-3 h-48 w-full rounded-lg object-contain"
    onError={(e) => {
      e.currentTarget.style.display = "none";
    }}
  />
) : (
  <div className="mb-3 flex h-48 items-center justify-center rounded-lg bg-slate-700 text-center text-gray-400">
    Image indisponible
  </div>
)}

                  <p className="font-bold">{carte.name}</p>

                  <p className="mt-1 text-sm text-gray-400">
                    Numéro : {carte.localId}
                  </p>

                  {carteEnCours === carte.id && (
                    <p className="mt-2 text-sm text-yellow-400">
                      Chargement...
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block font-semibold">
            📚 Édition
          </label>

          <input
            type="text"
            placeholder="Ex : Évolutions, 151..."
            value={edition}
            onChange={(e) => setEdition(e.target.value)}
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div>
          <label className="mb-2 block font-semibold">
            🏷️ Type
          </label>

          <select
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Choisir un type</option>
            <option>Feu</option>
            <option>Eau</option>
            <option>Plante</option>
            <option>Électrique</option>
            <option>Psy</option>
            <option>Combat</option>
            <option>Dragon</option>
            <option>Fée</option>
            <option>Glace</option>
            <option>Insecte</option>
            <option>Métal</option>
            <option>Poison</option>
            <option>Roche</option>
            <option>Spectre</option>
            <option>Ténèbres</option>
            <option>Vol</option>
            <option>Incolore</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-semibold">
            ⭐ État
          </label>

          <select
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            value={etat}
            onChange={(e) => setEtat(e.target.value)}
          >
            <option value="">Choisir un état</option>
            <option>Mint</option>
            <option>Near Mint</option>
            <option>Excellent</option>
            <option>Good</option>
            <option>Played</option>
            <option>Poor</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-semibold">
            💰 Prix en euros
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Ex : 25,50"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div>
          <label className="mb-2 block font-semibold">
            🖼️ Photo de la carte
          </label>

          <input
            type="file"
            accept="image/*"
            className="w-full rounded-xl bg-slate-700 p-4 text-white"
            onChange={(e) => {
              const fichier = e.target.files?.[0];

              if (!fichier) {
                return;
              }

              const lecteur = new FileReader();

              lecteur.onload = () => {
                setImage(lecteur.result as string);
              };

              lecteur.readAsDataURL(fichier);
            }}
          />

          {image && (
            <img
              src={image}
              alt="Aperçu de la carte"
              className="mx-auto mt-4 max-h-64 rounded-xl object-contain"
            />
          )}
        </div>

        <button
          type="button"
          onClick={onEnregistrer}
          className="mt-6 w-full rounded-xl bg-yellow-400 p-4 text-lg font-bold text-black transition hover:bg-yellow-500"
        >
          💾 Ajouter à la collection
        </button>
      </div>
    </div>
  );
}