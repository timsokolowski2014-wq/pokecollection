"use client";

import { useEffect, useState } from "react";
import Formulaire from "./components/Formulaire";
import PokemonCard from "./components/PokemonCard";
import { supabase } from "../lib/lib/supabase";

type Carte = {
  identifiant: number;
  nom: string;
  edition: string;
  numero: string;
  type: string;
  etat: string;
  prix: number;
  image: string;
  idApi: string;
  miseAJourAuto: boolean;
};

export default function Home() {
  const [cartes, setCartes] = useState<Carte[]>([]);

  const [nom, setNom] = useState("");
  const [edition, setEdition] = useState("");
  const [numero, setNumero] = useState("");
  const [type, setType] = useState("");
  const [etat, setEtat] = useState("");
  const [prix, setPrix] = useState("");
  const [image, setImage] = useState("");
  const [idApi, setIdApi] = useState("");

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("");
  const [tri, setTri] = useState("nom");
  const [miseAJourPrixEnCours, setMiseAJourPrixEnCours] = useState(false);

  const [cartesSelectionnees, setCartesSelectionnees] = useState<number[]>([]);

  useEffect(() => {
    async function chargerCartes() {
      const { data, error } = await supabase
        .from("cartes")
        .select("*")
        .order("id");

      if (error) {
        console.error(error);
        return;
      }

      if (!data) return;

    const cartesChargees: Carte[] = data.map((carte) => ({
  identifiant: carte.id,
  nom: carte.nom,
  edition: carte.edition,
  numero: carte.numero ?? "",
  type: carte.type_carte,
  etat: carte.etat,
  prix: Number(carte.prix),
  image: carte.image,
  idApi: carte.id_api ?? "",
  miseAJourAuto: carte.mise_a_jour_auto ?? true,
}));

setCartes(cartesChargees);
mettreAJourPrixAutomatiquement(cartesChargees);
    }

    chargerCartes();
  }, []);

  async function ajouterCarte() {
    const { data, error } = await supabase
      .from("cartes")
      .insert({
        nom,
        edition,
        numero,
        type_carte: type,
        etat,
        prix: Number(prix),
        image,
        id_api: idApi,
        mise_a_jour_auto: true,
      })
      .select()
      .single();

    if (error || !data) {
      alert(error?.message ?? "Erreur lors de l'ajout.");
      return;
    }

    setCartes([
      ...cartes,
      {
        identifiant: data.id,
        nom: data.nom,
        edition: data.edition,
        numero: data.numero ?? "",
        type: data.type_carte,
        etat: data.etat,
        prix: Number(data.prix),
        image: data.image,
        idApi: data.id_api ?? "",
        miseAJourAuto: data.mise_a_jour_auto ?? true,
      },
    ]);

    setNom("");
    setEdition("");
    setNumero("");
    setType("");
    setEtat("");
    setPrix("");
    setImage("");
    setIdApi("");
  }

async function mettreAJourPrix() {
  const cartesAMettreAJour = cartes.filter(
    (carte) => carte.miseAJourAuto && carte.idApi
  );

  if (cartesAMettreAJour.length === 0) {
    alert(
      "Aucune carte ne peut être mise à jour. Vérifie qu'elles ont un identifiant API."
    );
    return;
  }

  let nombreMisesAJour = 0;
  let nombreEchecs = 0;

  for (const carte of cartesAMettreAJour) {
    try {
      const reponse = await fetch(
        `https://api.tcgdex.net/v2/fr/cards/${encodeURIComponent(
          carte.idApi
        )}`
      );

      if (!reponse.ok) {
        nombreEchecs++;
        continue;
      }

      const carteApi = await reponse.json();

      const prixCardmarket = carteApi.pricing?.cardmarket;

      // On utilise d'abord le prix tendance.
      // S'il n'existe pas, on essaie le prix moyen.
      const nouveauPrix =
        prixCardmarket?.trend ??
        prixCardmarket?.avg ??
        prixCardmarket?.avg7 ??
        prixCardmarket?.avg30;

      if (typeof nouveauPrix !== "number") {
        nombreEchecs++;
        continue;
      }

      const dateMiseAJour =
        prixCardmarket?.updated ?? new Date().toISOString();

      const { error } = await supabase
        .from("cartes")
        .update({
          prix: nouveauPrix,
          prix_mis_a_jour: dateMiseAJour,
        })
        .eq("id", carte.identifiant);

      if (error) {
        console.error(error);
        nombreEchecs++;
        continue;
      }

      const { error: erreurHistorique } = await supabase
  .from("historique_prix")
  .insert({
    carte_id: carte.identifiant,
    prix: nouveauPrix,
    date_releve: dateMiseAJour,
  });

if (erreurHistorique) {
  console.error(erreurHistorique);
}

      setCartes((anciennesCartes) =>
        anciennesCartes.map((ancienneCarte) =>
          ancienneCarte.identifiant === carte.identifiant
            ? {
                ...ancienneCarte,
                prix: nouveauPrix,
              }
            : ancienneCarte
        )
      );

      nombreMisesAJour++;
    } catch (error) {
      console.error(error);
      nombreEchecs++;
    }
  }

  alert(
    `✅ ${nombreMisesAJour} prix mis à jour.\n` +
      `❌ ${nombreEchecs} carte(s) sans prix ou en erreur.`
  );
}

async function mettreAJourPrixAutomatiquement(cartesAActualiser: Carte[]) {
  if (miseAJourPrixEnCours) return;

  const cartesValides = cartesAActualiser.filter(
    (carte) => carte.miseAJourAuto && carte.idApi
  );

  if (cartesValides.length === 0) return;

  setMiseAJourPrixEnCours(true);

  try {
    for (const carte of cartesValides) {
      try {
        const reponse = await fetch(
          `https://api.tcgdex.net/v2/fr/cards/${encodeURIComponent(
            carte.idApi
          )}`
        );

        if (!reponse.ok) continue;

        const carteApi = await reponse.json();
        const cardmarket = carteApi.pricing?.cardmarket;

        const nouveauPrix =
          cardmarket?.trend ??
          cardmarket?.avg ??
          cardmarket?.avg7 ??
          cardmarket?.avg30 ??
          cardmarket?.["trend-holo"] ??
          cardmarket?.["avg-holo"];

        if (typeof nouveauPrix !== "number") continue;

        const dateMiseAJour =
          cardmarket?.updated ?? new Date().toISOString();

        const { error } = await supabase
          .from("cartes")
          .update({
            prix: nouveauPrix,
            prix_mis_a_jour: dateMiseAJour,
          })
          .eq("id", carte.identifiant);

        if (error) {
          console.error(error);
          continue;
        }

        setCartes((anciennesCartes) =>
          anciennesCartes.map((ancienneCarte) =>
            ancienneCarte.identifiant === carte.identifiant
              ? {
                  ...ancienneCarte,
                  prix: nouveauPrix,
                }
              : ancienneCarte
          )
        );
      } catch (error) {
        console.error(
          `Erreur pendant la mise à jour de ${carte.nom}`,
          error
        );
      }
    }
  } finally {
    setMiseAJourPrixEnCours(false);
  }
}

  function selectionnerCarte(id: number) {
    if (cartesSelectionnees.includes(id)) {
      setCartesSelectionnees(
        cartesSelectionnees.filter((x) => x !== id)
      );
    } else {
      setCartesSelectionnees([
        ...cartesSelectionnees,
        id,
      ]);
    }
  }

  function toutDeselectionner() {
    setCartesSelectionnees([]);
  }

  async function supprimerCartesSelectionnees() {
    if (cartesSelectionnees.length === 0) return;

    const confirmation = confirm(
      "Supprimer les cartes sélectionnées ?"
    );

    if (!confirmation) return;

    const { error } = await supabase
      .from("cartes")
      .delete()
      .in("id", cartesSelectionnees);

    if (error) {
      alert(error.message);
      return;
    }

    setCartes(
      cartes.filter(
        (carte) =>
          !cartesSelectionnees.includes(
            carte.identifiant ?? -1
          )
      )
    );

    setCartesSelectionnees([]);
  }

  const cartesFiltrees = cartes
    .filter((carte) => {
      const correspondRecherche =
        carte.nom
          .toLowerCase()
          .includes(recherche.toLowerCase()) ||
        carte.edition
          .toLowerCase()
          .includes(recherche.toLowerCase()) ||
        carte.type
          .toLowerCase()
          .includes(recherche.toLowerCase()) ||
        carte.etat
          .toLowerCase()
          .includes(recherche.toLowerCase());

      const correspondType =
        filtreType === "" ||
        carte.type === filtreType;

      return (
        correspondRecherche && correspondType
      );
    })
    .sort((a, b) => {
      if (tri === "prix-croissant")
        return a.prix - b.prix;

      if (tri === "prix-decroissant")
        return b.prix - a.prix;

      if (tri === "edition")
        return a.edition.localeCompare(
          b.edition
        );

      if (tri === "nom-z-a")
        return b.nom.localeCompare(a.nom);

      return a.nom.localeCompare(b.nom);
    });

  const valeurCollection = cartes.reduce(
    (total, carte) => total + carte.prix,
    0
  );

  const prixMoyen =
  cartes.length > 0
    ? valeurCollection / cartes.length
    : 0;

const carteLaPlusChere =
  cartes.length > 0
    ? cartes.reduce((plusChere, carte) =>
        carte.prix > plusChere.prix
          ? carte
          : plusChere
      )
    : null;

const statistiquesParType = cartes.reduce<
  Record<string, number>
>((statistiques, carte) => {
  const typeCarte = carte.type || "Sans type";

  statistiques[typeCarte] =
    (statistiques[typeCarte] || 0) + 1;

  return statistiques;
}, {});

  return (
        <main className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="mb-8 text-center text-5xl font-bold">
        🃏 PokéCollection
      </h1>

      <div className="mb-10 flex flex-wrap justify-center gap-10 text-xl">
        <p>
          📊 Total : {cartes.length} carte
          {cartes.length > 1 ? "s" : ""}
        </p>

        <p>
          💰 Valeur : {valeurCollection.toFixed(2)} €
        </p>
      </div>

      <Formulaire
        nom={nom}
        setNom={setNom}
        edition={edition}
        setEdition={setEdition}
        type={type}
        setType={setType}
        etat={etat}
        setEtat={setEtat}
        prix={prix}
        setPrix={setPrix}
        image={image}
        setImage={setImage}
        numero={numero}
        setNumero={setNumero}
        onEnregistrer={ajouterCarte}
        idApi={idApi}
        setIdApi={setIdApi}
      />

      <div className="mx-auto mt-8 max-w-2xl">
        <div className="mb-4 flex gap-4">
          <button
            type="button"
            onClick={supprimerCartesSelectionnees}
            disabled={cartesSelectionnees.length === 0}
            className={`flex-1 rounded-xl p-4 font-bold transition ${
              cartesSelectionnees.length === 0
                ? "cursor-not-allowed bg-slate-700 text-gray-400"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            🗑️ Supprimer les cartes sélectionnées
            {cartesSelectionnees.length > 0 &&
              ` (${cartesSelectionnees.length})`}
          </button>

          <button
            type="button"
            onClick={toutDeselectionner}
            disabled={cartesSelectionnees.length === 0}
            className={`flex-1 rounded-xl p-4 font-bold transition ${
              cartesSelectionnees.length === 0
                ? "cursor-not-allowed bg-slate-700 text-gray-400"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            ❌ Tout désélectionner
          </button>
        </div>

        <button
  type="button"
  onClick={mettreAJourPrix}
  className="flex-1 rounded-xl bg-green-600 p-4 font-bold text-white transition hover:bg-green-700"
>
  🔄 Mettre à jour les prix
</button>

        <input
          type="text"
          placeholder="🔍 Rechercher une carte..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full rounded-xl bg-slate-800 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <div className="mt-4">
          <label className="mb-2 block font-semibold">
            📊 Trier les cartes
          </label>

          <select
            value={tri}
            onChange={(e) => setTri(e.target.value)}
            className="w-full rounded-xl bg-slate-800 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="nom">Nom A → Z</option>
            <option value="nom-z-a">Nom Z → A</option>
            <option value="prix-croissant">Prix croissant</option>
            <option value="prix-decroissant">Prix décroissant</option>
            <option value="edition">Édition A → Z</option>
          </select>
        </div>

        <div className="mt-4">
          <label className="mb-2 block font-semibold">
            🏷️ Filtrer par type
          </label>

          <select
            value={filtreType}
            onChange={(e) => setFiltreType(e.target.value)}
            className="w-full rounded-xl bg-slate-800 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">Tous les types</option>
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

               <p className="mt-4 text-center text-gray-400">
  {cartesFiltrees.length === 1
    ? "1 carte trouvée"
    : `${cartesFiltrees.length} cartes trouvées`}
</p>

<p className="mt-2 text-center text-yellow-400">
  {cartesSelectionnees.length === 1
    ? "1 carte sélectionnée"
    : `${cartesSelectionnees.length} cartes sélectionnées`}
</p>
      </div>

      <section className="mt-10">
        <h2 className="mb-6 text-3xl font-bold">
          📊 Statistiques
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-slate-800 p-5 text-center">
            <p className="text-gray-400">
              Nombre de cartes
            </p>

            <p className="mt-2 text-3xl font-bold">
              {cartes.length}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-800 p-5 text-center">
            <p className="text-gray-400">
              Valeur totale
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {valeurCollection.toFixed(2)} €
            </p>
          </div>

          <div className="rounded-2xl bg-slate-800 p-5 text-center">
            <p className="text-gray-400">
              Prix moyen
            </p>

            <p className="mt-2 text-3xl font-bold">
              {prixMoyen.toFixed(2)} €
            </p>
          </div>

          <div className="rounded-2xl bg-slate-800 p-5 text-center">
            <p className="text-gray-400">
              Carte la plus chère
            </p>

            <p className="mt-2 text-xl font-bold">
              {carteLaPlusChere
                ? carteLaPlusChere.nom
                : "Aucune carte"}
            </p>

            {carteLaPlusChere && (
              <p className="mt-1 text-yellow-400">
                {carteLaPlusChere.prix.toFixed(2)} €
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-800 p-5">
          <h3 className="mb-4 text-xl font-bold">
            Cartes par type
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(statistiquesParType)
              .sort((a, b) => b[1] - a[1])
              .map(([typeCarte, nombre]) => (
                <div
                  key={typeCarte}
                  className="rounded-xl bg-slate-700 p-3"
                >
                  <p className="font-semibold">
                    {typeCarte}
                  </p>

                  <p className="text-gray-300">
                    {nombre} carte
                    {nombre > 1 ? "s" : ""}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </section>
            <h2 className="mb-6 mt-10 text-3xl font-bold">
        📚 Mes cartes
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cartesFiltrees.map((carte) => {
          const identifiant = carte.identifiant;

          return (
            <PokemonCard
              key={
                identifiant ??
                `${carte.nom}-${carte.edition}`
              }
              nom={carte.nom}
              edition={carte.edition}
              type={carte.type}
              etat={carte.etat}
              prix={carte.prix}
              image={carte.image}
              selectionnee={
                identifiant !== undefined &&
                cartesSelectionnees.includes(
                  identifiant
                )
              }
              onSelectionner={() => {
                if (identifiant !== undefined) {
                  selectionnerCarte(identifiant);
                }
              }}
            />
          );
        })}
      </div>
    </main>
  );
}