"use client";

import { ChangeEvent, useState } from "react";

type FormulaireProps = {
  nom: string;
  setNom: (valeur: string) => void;
  edition: string;
  setEdition: (valeur: string) => void;
  numero: string;
  setNumero: (valeur: string) => void;
  type: string;
  setType: (valeur: string) => void;
  etat: string;
  setEtat: (valeur: string) => void;
  prix: string;
  setPrix: (valeur: string) => void;
  image: string;
  setImage: (valeur: string) => void;
  idApi: string;
  setIdApi: (valeur: string) => void;
  proprietaire: "Timothée" | "Valentin";
  quantite: string;
  setQuantite: (valeur: string) => void;
  setProprietaire: (valeur: "Timothée" | "Valentin") => void;
  onEnregistrer: () => void;
};

type CarteRecherche = {
  id: string;
  localId?: string;
  name: string;
  image?: string;
};

type CarteDetaillee = {
  id: string;
  localId?: string;
  name?: string;
  image?: string;
  types?: string[];
  set?: {
    name?: string;
  };
  pricing?: {
    cardmarket?: {
      trend?: number;
      avg?: number;
      avg7?: number;
      avg30?: number;
      "trend-holo"?: number;
      "avg-holo"?: number;
    };
  };
};

const traductionTypes: Record<string, string> = {
  Fire: "Feu",
  Water: "Eau",
  Grass: "Plante",
  Lightning: "Électrique",
  Psychic: "Psy",
  Fighting: "Combat",
  Dragon: "Dragon",
  Fairy: "Fée",
  Ice: "Glace",
  Darkness: "Ténèbres",
  Metal: "Métal",
  Colorless: "Incolore",
};

const classeChamp =
  "mt-3 w-full rounded-2xl border border-slate-600 bg-slate-700 px-4 py-4 text-base text-white outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30";

export default function Formulaire({
  nom,
  setNom,
  edition,
  setEdition,
  numero,
  setNumero,
  type,
  setType,
  etat,
  setEtat,
  prix,
  setPrix,
  image,
  setImage,
  idApi,
  setIdApi,
  proprietaire,
  setProprietaire,
  quantite,
  setQuantite,
  onEnregistrer,
}: FormulaireProps) {
  const [resultats, setResultats] = useState<CarteRecherche[]>([]);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [selectionEnCours, setSelectionEnCours] = useState(false);
  const [rechercheEffectuee, setRechercheEffectuee] = useState(false);
  const [carteChoisie, setCarteChoisie] = useState(false);
  const [imageManquante, setImageManquante] = useState(false);
  const [nomFichier, setNomFichier] = useState("");

  async function rechercherCartes() {
    const nomRecherche = nom.trim();
    const numeroRecherche = numero.trim().split("/")[0].trim();

    if (nomRecherche.length < 2) {
      alert("Écris au moins 2 lettres dans le nom de la carte.");
      return;
    }

    setRechercheEnCours(true);
    setRechercheEffectuee(true);
    setCarteChoisie(false);
    setImageManquante(false);
    setResultats([]);

    try {
      const parametres = new URLSearchParams();

      // TCGdex accepte une recherche partielle sur le nom.
      parametres.set("name", nomRecherche);

      // Si un numéro est renseigné, on l'envoie directement à TCGdex.
      // Ainsi "225" et "225/198" recherchent tous les deux localId = 225.
      if (numeroRecherche) {
        parametres.set("localId", numeroRecherche);
      }

      parametres.set("pagination:page", "1");
      parametres.set("pagination:itemsPerPage", "100");

      let reponse = await fetch(
        `https://api.tcgdex.net/v2/fr/cards?${parametres.toString()}`
      );

      if (!reponse.ok) {
        throw new Error("La recherche TCGdex a échoué.");
      }

      let cartes: CarteRecherche[] = await reponse.json();

      // Petit secours si aucun résultat n'est trouvé :
      // on retente le nom sans accents.
      if (!Array.isArray(cartes) || cartes.length === 0) {
        const nomSansAccents = nomRecherche
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (nomSansAccents !== nomRecherche) {
          const parametresSansAccents = new URLSearchParams();
          parametresSansAccents.set("name", nomSansAccents);

          if (numeroRecherche) {
            parametresSansAccents.set("localId", numeroRecherche);
          }

          parametresSansAccents.set("pagination:page", "1");
          parametresSansAccents.set("pagination:itemsPerPage", "100");

          reponse = await fetch(
            `https://api.tcgdex.net/v2/fr/cards?${parametresSansAccents.toString()}`
          );

          if (reponse.ok) {
            cartes = await reponse.json();
          }
        }
      }

      const cartesFiltrees = Array.isArray(cartes)
        ? cartes.filter((carte) => {
            if (!numeroRecherche) return true;

            return (
              String(carte.localId ?? "")
                .trim()
                .toLowerCase() === numeroRecherche.toLowerCase()
            );
          })
        : [];

      setResultats(cartesFiltrees);
    } catch (erreur) {
      console.error("Erreur pendant la recherche :", erreur);
      alert("Impossible de rechercher les cartes pour le moment.");
    } finally {
      setRechercheEnCours(false);
    }
  }

  async function choisirCarte(carte: CarteRecherche) {
    setSelectionEnCours(true);

    try {
      const reponse = await fetch(
        `https://api.tcgdex.net/v2/fr/cards/${encodeURIComponent(carte.id)}`
      );

      if (!reponse.ok) {
        throw new Error("Impossible de charger cette carte.");
      }

      const details: CarteDetaillee = await reponse.json();
      const prixCardmarket = details.pricing?.cardmarket;

      const prixTrouve =
        prixCardmarket?.trend ??
        prixCardmarket?.avg ??
        prixCardmarket?.avg7 ??
        prixCardmarket?.avg30 ??
        prixCardmarket?.["trend-holo"] ??
        prixCardmarket?.["avg-holo"];

      const typeAnglais = details.types?.[0] ?? "";
      const typeFrancais =
        traductionTypes[typeAnglais] || typeAnglais || "Sans type";

      setNom(details.name ?? carte.name);
      setNumero(details.localId ?? carte.localId ?? "");
      setEdition(details.set?.name ?? "");
      setType(typeFrancais);
      setIdApi(details.id ?? carte.id);
      setCarteChoisie(true);

      const imageTrouvee = details.image ?? carte.image;

      if (imageTrouvee) {
        setImage(`${imageTrouvee}/high.webp`);
        setNomFichier("Image TCGdex");
        setImageManquante(false);
      } else {
        setImage("");
        setNomFichier("");
        setImageManquante(true);
      }

      if (typeof prixTrouve === "number") {
        setPrix(prixTrouve.toFixed(2));
      }

      setResultats([]);
      setRechercheEffectuee(false);
    } catch (erreur) {
      console.error("Erreur pendant le chargement de la carte :", erreur);
      alert("Impossible de charger cette carte.");
    } finally {
      setSelectionEnCours(false);
    }
  }

  function choisirPhoto(evenement: ChangeEvent<HTMLInputElement>) {
    const fichier = evenement.target.files?.[0];

    if (!fichier) return;

    if (!fichier.type.startsWith("image/")) {
      alert("Choisis un fichier image.");
      evenement.target.value = "";
      return;
    }

    const tailleMaximale = 3 * 1024 * 1024;

    if (fichier.size > tailleMaximale) {
      alert("L’image est trop lourde. Choisis une image de moins de 3 Mo.");
      evenement.target.value = "";
      return;
    }

    const lecteur = new FileReader();

    lecteur.onload = () => {
      if (typeof lecteur.result === "string") {
        setImage(lecteur.result);
        setNomFichier(fichier.name);
        setImageManquante(false);
      }
    };

    lecteur.onerror = () => {
      alert("Impossible de lire cette image.");
    };

    lecteur.readAsDataURL(fichier);
  }

  const typePrincipal = type.startsWith("Dresseur")
    ? "Dresseur"
    : type.startsWith("Énergie")
      ? "Énergie"
      : type;

  const sousTypeDresseur = type.startsWith("Dresseur - ")
    ? type.replace("Dresseur - ", "")
    : "";

  const sousTypeEnergie = type.startsWith("Énergie ")
    ? type.replace("Énergie ", "")
    : "";

  const ajoutImpossible =
    selectionEnCours ||
    !nom.trim() ||
    !edition.trim() ||
    !etat ||
    !prix ||
    !quantite ||
    Number(quantite) < 1 ||
    !image;

  return (
    <section className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-2xl sm:p-8">
      <div className="mb-8">
        <h2 className="text-4xl font-bold leading-tight text-white">
          ➕ Ajouter une carte
        </h2>

        <p className="mt-3 text-lg leading-relaxed text-gray-400">
          Remplis les informations ou recherche une carte Pokémon.
        </p>
      </div>

      <div className="space-y-7">
        <div>
          <p className="text-lg font-bold text-white">
            👤 Propriétaire de la carte
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProprietaire("Timothée")}
              className={`rounded-2xl border px-4 py-4 font-bold transition ${
                proprietaire === "Timothée"
                  ? "border-blue-300/70 bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "border-slate-600 bg-slate-700 text-slate-300 hover:border-blue-400/50"
              }`}
            >
              👤 Timothée
            </button>

            <button
              type="button"
              onClick={() => setProprietaire("Valentin")}
              className={`rounded-2xl border px-4 py-4 font-bold transition ${
                proprietaire === "Valentin"
                  ? "border-violet-300/70 bg-violet-600 text-white shadow-lg shadow-violet-950/30"
                  : "border-slate-600 bg-slate-700 text-slate-300 hover:border-violet-400/50"
              }`}
            >
              👤 Valentin
            </button>
          </div>
        </div>

        <label className="block text-lg font-bold text-white">
          🔴 Nom de la carte
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Pikachu ex"
            className={classeChamp}
          />
        </label>

        <label className="block text-lg font-bold text-white">
          🔢 Numéro de la carte
          <input
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Exemple : 238/191"
            className={classeChamp}
          />

          <span className="mt-3 block text-sm font-normal leading-relaxed text-gray-400">
            Le numéro est facultatif, mais il aide à trouver la bonne carte.
          </span>
        </label>

        <button
          type="button"
          onClick={rechercherCartes}
          disabled={rechercheEnCours}
          className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-xl font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:bg-slate-600"
        >
          {rechercheEnCours
            ? "⏳ Recherche en cours..."
            : "🔍 Rechercher la carte"}
        </button>

        {rechercheEffectuee && (
          <div className="rounded-2xl border border-slate-600 bg-slate-900 p-4">
            <h3 className="mb-4 text-2xl font-bold text-white">
              Résultats trouvés : {resultats.length}
            </h3>

            {resultats.length === 0 && !rechercheEnCours ? (
              <p className="text-gray-400">
                Aucune carte trouvée. Vérifie le nom ou le numéro.
              </p>
            ) : (
              <div className="grid max-h-[34rem] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
                {resultats.map((carte) => (
                  <button
                    key={carte.id}
                    type="button"
                    onClick={() => choisirCarte(carte)}
                    disabled={selectionEnCours}
                    className="rounded-xl border border-slate-600 bg-slate-800 p-3 text-left transition hover:border-blue-400 hover:bg-slate-700 disabled:cursor-wait"
                  >
                    {carte.image ? (
                      <img
                        src={`${carte.image}/low.webp`}
                        alt={carte.name}
                        className="mx-auto h-44 w-full rounded-lg object-contain"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center rounded-lg bg-slate-700 text-center text-sm text-gray-300">
                        🖼️ Image non disponible
                      </div>
                    )}

                    <p className="mt-3 font-bold text-white">
                      {carte.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Numéro : {carte.localId || "Inconnu"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="block text-lg font-bold text-white">
          📚 Édition
          <input
            type="text"
            value={edition}
            onChange={(e) => setEdition(e.target.value)}
            placeholder="Ex : Évolutions, 151..."
            className={classeChamp}
          />
        </label>

        <label className="block text-lg font-bold text-white">
          🏷️ Type
          <select
            value={typePrincipal}
            onChange={(e) => setType(e.target.value)}
            className={classeChamp}
          >
            <option value="">Choisir un type</option>
            <option value="Dresseur">🧑‍🏫 Dresseur</option>
            <option value="Énergie">⚪ Énergie</option>
            <option value="Feu">🔥 Feu</option>
            <option value="Eau">💧 Eau</option>
            <option value="Plante">🌿 Plante</option>
            <option value="Électrique">⚡ Électrique</option>
            <option value="Psy">🧠 Psy</option>
            <option value="Combat">🥊 Combat</option>
            <option value="Dragon">🐉 Dragon</option>
            <option value="Glace">❄️ Glace</option>
            <option value="Ténèbres">🌑 Ténèbres</option>
            <option value="Métal">⚙️ Métal</option>
            <option value="Fée">🧚 Fée</option>
            <option value="Roche">🪨 Roche</option>
            <option value="Sol">🌍 Sol</option>
            <option value="Poison">☠️ Poison</option>
            <option value="Spectre">👻 Spectre</option>
            <option value="Insecte">🐛 Insecte</option>
            <option value="Vol">🕊️ Vol</option>
            <option value="Incolore">⭐ Incolore</option>
          </select>
        </label>

        {typePrincipal === "Dresseur" && (
          <label className="block text-lg font-bold text-white">
            🧑‍🏫 Sous-type Dresseur
            <select
              value={sousTypeDresseur}
              onChange={(e) =>
                setType(
                  e.target.value
                    ? `Dresseur - ${e.target.value}`
                    : "Dresseur"
                )
              }
              className={classeChamp}
            >
              <option value="">Dresseur général</option>
              <option value="Supporter">Supporter</option>
              <option value="Objet">Objet</option>
              <option value="Outil Pokémon">Outil Pokémon</option>
              <option value="Stade">Stade</option>
            </select>
          </label>
        )}

        {typePrincipal === "Énergie" && (
          <label className="block text-lg font-bold text-white">
            ⚪ Sous-type Énergie
            <select
              value={sousTypeEnergie}
              onChange={(e) =>
                setType(
                  e.target.value
                    ? `Énergie ${e.target.value}`
                    : "Énergie"
                )
              }
              className={classeChamp}
            >
              <option value="">Énergie générale</option>
              <option value="Feu">🔥 Feu</option>
              <option value="Eau">💧 Eau</option>
              <option value="Plante">🌿 Plante</option>
              <option value="Électrique">⚡ Électrique</option>
              <option value="Psy">🧠 Psy</option>
              <option value="Combat">🥊 Combat</option>
              <option value="Obscurité">🌑 Obscurité</option>
              <option value="Métal">⚙️ Métal</option>
              <option value="Fée">🧚 Fée</option>
              <option value="Spéciale">✨ Spéciale</option>
            </select>
          </label>
        )}

        <label className="block text-lg font-bold text-white">
          ⭐ État
          <select
            value={etat}
            onChange={(e) => setEtat(e.target.value)}
            className={classeChamp}
          >
            <option value="">Choisir un état</option>
            <option value="Neuf">Neuf</option>
            <option value="Quasi neuf">Quasi neuf</option>
            <option value="Très bon">Très bon</option>
            <option value="Bon">Bon</option>
            <option value="Correct">Correct</option>
            <option value="Abîmé">Abîmé</option>
          </select>
        </label>

        <label className="block text-lg font-bold text-white">
          💰 Prix en euros
          <input
            type="number"
            min="0"
            step="0.01"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            placeholder="Ex : 25,50"
            className={classeChamp}
          />
        </label>

        <label className="block text-lg font-bold text-white">
          📦 Quantité
          <input
            type="number"
            min="1"
            step="1"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            className={classeChamp}
          />
          <span className="mt-2 block text-sm font-normal text-gray-400">
            Ex : 2 si tu as cette carte en double, 3 si tu l’as en triple.
          </span>
        </label>

        {image ? (
          <div className="rounded-2xl border border-green-500/40 bg-slate-900 p-5">
            <p className="mb-4 text-lg font-bold text-green-300">
              ✅ Image de la carte
            </p>

            <img
              src={image}
              alt="Aperçu de la carte"
              className="mx-auto max-h-96 rounded-xl object-contain"
            />

            <label className="mt-5 block text-base font-bold text-white">
              Changer l’image
              <input
                type="file"
                accept="image/*"
                onChange={choisirPhoto}
                className="mt-3 block w-full cursor-pointer rounded-2xl border border-slate-600 bg-slate-700 p-3 text-sm text-white"
              />
            </label>

            {nomFichier && (
              <p className="mt-3 text-sm text-gray-400">
                Image choisie : {nomFichier}
              </p>
            )}
          </div>
        ) : (
          <div
            className={`rounded-2xl border p-6 text-center ${
              imageManquante || carteChoisie
                ? "border-orange-400/60 bg-orange-950/30"
                : "border-slate-600 bg-slate-900"
            }`}
          >
            <p className="text-2xl font-bold text-white">
              🖼️ Image non disponible
            </p>

            <p className="mt-2 text-gray-400">
              Choisis une image de la carte depuis ton ordinateur.
            </p>

            <label className="mt-5 inline-block cursor-pointer rounded-xl bg-orange-500 px-6 py-4 text-lg font-bold text-white transition hover:bg-orange-600">
              Choisir une image
              <input
                type="file"
                accept="image/*"
                onChange={choisirPhoto}
                className="hidden"
              />
            </label>
          </div>
        )}

        <input type="hidden" value={idApi} readOnly />

        <button
          type="button"
          onClick={onEnregistrer}
          disabled={ajoutImpossible}
          className="w-full rounded-2xl bg-yellow-400 px-5 py-4 text-xl font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-gray-300"
        >
          {image
            ? "💾 Ajouter à la collection"
            : "🖼️ Choisis d’abord une image"}
        </button>
      </div>
    </section>
  );
}