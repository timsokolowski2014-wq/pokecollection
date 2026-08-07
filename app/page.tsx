"use client";

import { useEffect, useState } from "react";
import Formulaire from "./components/Formulaire";
import PokemonCard from "./components/PokemonCard";
import GraphiqueEvolution from "./components/GraphiqueEvolution";
import { supabase } from "../lib/lib/supabase";
import HeaderPokemon from "./components/HeaderPokemon";
import Notification from "./components/Notification";

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
  proprietaire: "Timothée" | "Valentin";
};

type HistoriquePrix = {
  id: number;
  carte_id: number;
  prix: number;
  date_releve: string;
};

export default function Home() {
  const [cartes, setCartes] = useState<Carte[]>([]);
  const [historiquePrix, setHistoriquePrix] = useState<HistoriquePrix[]>([]);

  const [nom, setNom] = useState("");
  const [edition, setEdition] = useState("");
  const [numero, setNumero] = useState("");
  const [type, setType] = useState("");
  const [etat, setEtat] = useState("");
  const [prix, setPrix] = useState("");
  const [image, setImage] = useState("");
  const [idApi, setIdApi] = useState("");
  const [proprietaireCarte, setProprietaireCarte] = useState<
    "Timothée" | "Valentin"
  >("Timothée");
  const [collectionActive, setCollectionActive] = useState<
    "Timothée" | "Valentin"
  >("Timothée");

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("");
  const [tri, setTri] = useState("edition-chronologique");
  const [miseAJourPrixEnCours, setMiseAJourPrixEnCours] = useState(false);
  const [cartesSelectionnees, setCartesSelectionnees] = useState<number[]>([]);
  const [favoris, setFavoris] = useState<number[]>([]);
  const [carteAgrandie, setCarteAgrandie] = useState<Carte | null>(null);
  const [editionsOuvertes, setEditionsOuvertes] = useState<string[]>([]);
  const [modeCollection, setModeCollection] = useState<
    "cartes" | "editions" | "favoris" | "dresseurs" | "energies" | "pokemons"
  >("cartes");

  const [graphiqueAffiche, setGraphiqueAffiche] = useState<
    "collection" | "edition" | "carte" | null
  >(null);
  const [carteGraphiqueId, setCarteGraphiqueId] = useState<number | null>(null);
  const [editionGraphique, setEditionGraphique] = useState("");
  const [carteEnModification, setCarteEnModification] =
    useState<Carte | null>(null);

    const [notificationVisible, setNotificationVisible] =
  useState(false);

const [messageNotification, setMessageNotification] =
  useState("");

const cartesCollection = cartes.filter(
  (carte) => carte.proprietaire === collectionActive
);

const nombreCartesTimothee = cartes.filter(
  (carte) => carte.proprietaire === "Timothée"
).length;

const nombreCartesValentin = cartes.filter(
  (carte) => carte.proprietaire === "Valentin"
).length;

   const statistiquesParEdition = cartesCollection.reduce<
  Record<string, { nombre: number; valeur: number }>
>((statistiques, carte) => {
  const edition = carte.edition || "Sans édition";
  const prix = Number(carte.prix) || 0;

  if (!statistiques[edition]) {
    statistiques[edition] = {
      nombre: 0,
      valeur: 0,
    };
  }

  statistiques[edition].nombre += 1;
  statistiques[edition].valeur += prix;

  return statistiques;
}, {});

  useEffect(() => {
    try {
      const favorisEnregistres = window.localStorage.getItem(
        `pokecollection-favoris-${collectionActive}`
      );

      if (favorisEnregistres) {
        const valeurs = JSON.parse(favorisEnregistres);

        if (Array.isArray(valeurs)) {
          setFavoris(
            valeurs.filter((valeur): valeur is number =>
              typeof valeur === "number"
            )
          );
        }
      }
    } catch (error) {
      console.error("Impossible de charger les favoris :", error);
    }
  }, [collectionActive]);

  useEffect(() => {
    window.localStorage.setItem(
      `pokecollection-favoris-${collectionActive}`,
      JSON.stringify(favoris)
    );
  }, [favoris, collectionActive]);

  useEffect(() => {
    setCartesSelectionnees([]);
    setGraphiqueAffiche(null);
    setCarteAgrandie(null);
    setModeCollection("cartes");
    setProprietaireCarte(collectionActive);
  }, [collectionActive]);

  useEffect(() => {
    async function chargerDonnees() {
      const { data: cartesSupabase, error: erreurCartes } = await supabase
        .from("cartes")
        .select("*")
        .order("id");

      if (erreurCartes) {
        console.error(
          "Erreur pendant le chargement des cartes :",
          erreurCartes
        );
        return;
      }

      const cartesChargees: Carte[] = (cartesSupabase ?? []).map((carte) => ({
        identifiant: carte.id,
        nom: carte.nom,
        edition: carte.edition,
        numero: carte.numero ?? "",
        type: carte.type_carte ?? "Sans type",
        etat: carte.etat,
        prix: Number(carte.prix) || 0,
        image: carte.image ?? "",
        idApi: carte.id_api ?? "",
        miseAJourAuto: carte.mise_a_jour_auto ?? true,
        proprietaire:
          carte.proprietaire === "Valentin" ? "Valentin" : "Timothée",
      }));

      setCartes(cartesChargees);

      const {
        data: historiqueSupabase,
        error: erreurHistorique,
      } = await supabase
        .from("historique_prix")
        .select("*")
        .order("date_releve", { ascending: true });

      if (erreurHistorique) {
        console.error(
          "Erreur pendant le chargement de l'historique :",
          erreurHistorique
        );
      } else {
        setHistoriquePrix(
          (historiqueSupabase ?? []).map((ligne) => ({
            id: ligne.id,
            carte_id: ligne.carte_id,
            prix: Number(ligne.prix) || 0,
            date_releve: ligne.date_releve,
          }))
        );
      }

      await mettreAJourPrixAutomatiquement(cartesChargees);
    }

    void chargerDonnees();
    // Le chargement doit se lancer une seule fois à l'ouverture de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ajouterCarte() {
    if (!nom.trim() || !edition.trim() || !etat.trim() || !prix) {
      alert("Remplis au minimum le nom, l'édition, l'état et le prix.");
      return;
    }

    const prixNumerique = Number(prix);

    if (Number.isNaN(prixNumerique) || prixNumerique < 0) {
      alert("Le prix n'est pas valide.");
      return;
    }

    const { data, error } = await supabase
      .from("cartes")
      .insert({
        nom: nom.trim(),
        edition: edition.trim(),
        numero: numero.trim(),
        type_carte: type || "Sans type",
        etat,
        prix: prixNumerique,
        image: image.trim(),
        id_api: idApi.trim(),
        mise_a_jour_auto: true,
        proprietaire: proprietaireCarte,
      })
      .select()
      .single();

    if (error || !data) {
      alert(error?.message ?? "Erreur pendant l'ajout de la carte.");
      return;
    }

    const nouvelleCarte: Carte = {
      identifiant: data.id,
      nom: data.nom,
      edition: data.edition,
      numero: data.numero ?? "",
      type: data.type_carte ?? "Sans type",
      etat: data.etat,
      prix: Number(data.prix) || 0,
      image: data.image ?? "",
      idApi: data.id_api ?? "",
      miseAJourAuto: data.mise_a_jour_auto ?? true,
      proprietaire:
        data.proprietaire === "Valentin" ? "Valentin" : proprietaireCarte,
    };

    setCartes((anciennesCartes) => [...anciennesCartes, nouvelleCarte]);

    setMessageNotification(
  `${nouvelleCarte.nom} a bien été ajoutée à ta collection.`
);

setNotificationVisible(true);

window.setTimeout(() => {
  setNotificationVisible(false);
}, 3500);

    setNom("");
    setEdition("");
    setNumero("");
    setType("");
    setEtat("");
    setPrix("");
    setImage("");
    setIdApi("");
    setProprietaireCarte(collectionActive);
  }

  async function mettreAJourPrix() {
    const cartesAMettreAJour = cartesCollection.filter(
      (carte) => carte.miseAJourAuto && carte.idApi
    );

    if (cartesAMettreAJour.length === 0) {
      alert(
        "Aucune carte ne peut être mise à jour. Vérifie qu'elles ont un identifiant API."
      );
      return;
    }

    setMiseAJourPrixEnCours(true);

    let nombreMisesAJour = 0;
    let nombreEchecs = 0;

    try {
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

          const nouveauPrix =
            prixCardmarket?.trend ??
            prixCardmarket?.avg ??
            prixCardmarket?.avg7 ??
            prixCardmarket?.avg30 ??
            prixCardmarket?.["trend-holo"] ??
            prixCardmarket?.["avg-holo"];

          if (typeof nouveauPrix !== "number") {
            nombreEchecs++;
            continue;
          }

          const dateMiseAJour =
            prixCardmarket?.updated ?? new Date().toISOString();

          const { error: erreurMiseAJour } = await supabase
            .from("cartes")
            .update({
              prix: nouveauPrix,
              prix_mis_a_jour: dateMiseAJour,
            })
            .eq("id", carte.identifiant);

          if (erreurMiseAJour) {
            console.error(erreurMiseAJour);
            nombreEchecs++;
            continue;
          }

          const {
            data: nouvelHistorique,
            error: erreurHistorique,
          } = await supabase
            .from("historique_prix")
            .insert({
              carte_id: carte.identifiant,
              prix: nouveauPrix,
              date_releve: dateMiseAJour,
            })
            .select()
            .single();

          if (erreurHistorique) {
            console.error("Erreur historique :", erreurHistorique);
          } else if (nouvelHistorique) {
            setHistoriquePrix((ancienHistorique) => [
              ...ancienHistorique,
              {
                id: nouvelHistorique.id,
                carte_id: nouvelHistorique.carte_id,
                prix: Number(nouvelHistorique.prix) || 0,
                date_releve: nouvelHistorique.date_releve,
              },
            ]);
          }

          setCartes((anciennesCartes) =>
            anciennesCartes.map((ancienneCarte) =>
              ancienneCarte.identifiant === carte.identifiant
                ? { ...ancienneCarte, prix: nouveauPrix }
                : ancienneCarte
            )
          );

          nombreMisesAJour++;
        } catch (error) {
          console.error(`Erreur pour ${carte.nom} :`, error);
          nombreEchecs++;
        }
      }
    } finally {
      setMiseAJourPrixEnCours(false);
    }

    alert(
      `✅ ${nombreMisesAJour} prix mis à jour.\n` +
        `❌ ${nombreEchecs} carte(s) sans prix ou en erreur.`
    );
  }

  async function mettreAJourPrixAutomatiquement(
    cartesAActualiser: Carte[]
  ) {
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
          const prixCardmarket = carteApi.pricing?.cardmarket;

          const nouveauPrix =
            prixCardmarket?.trend ??
            prixCardmarket?.avg ??
            prixCardmarket?.avg7 ??
            prixCardmarket?.avg30 ??
            prixCardmarket?.["trend-holo"] ??
            prixCardmarket?.["avg-holo"];

          if (typeof nouveauPrix !== "number") continue;

          const dateMiseAJour =
            prixCardmarket?.updated ?? new Date().toISOString();

          const { error: erreurMiseAJour } = await supabase
            .from("cartes")
            .update({
              prix: nouveauPrix,
              prix_mis_a_jour: dateMiseAJour,
            })
            .eq("id", carte.identifiant);

          if (erreurMiseAJour) {
            console.error(erreurMiseAJour);
            continue;
          }

          setCartes((anciennesCartes) =>
            anciennesCartes.map((ancienneCarte) =>
              ancienneCarte.identifiant === carte.identifiant
                ? { ...ancienneCarte, prix: nouveauPrix }
                : ancienneCarte
            )
          );
        } catch (error) {
          console.error(
            `Erreur pendant la mise à jour de ${carte.nom} :`,
            error
          );
        }
      }
    } finally {
      setMiseAJourPrixEnCours(false);
    }
  }

  function basculerEdition(nomEdition: string) {
    setEditionsOuvertes((anciennesEditions) =>
      anciennesEditions.includes(nomEdition)
        ? anciennesEditions.filter((edition) => edition !== nomEdition)
        : [...anciennesEditions, nomEdition]
    );
  }

  function ouvrirToutesLesEditions() {
    setEditionsOuvertes(
      cartesParEdition.map(([nomEdition]) => nomEdition)
    );
  }

  function fermerToutesLesEditions() {
    setEditionsOuvertes([]);
  }

  function selectionnerCarte(identifiant: number) {
    setCartesSelectionnees((anciennesSelections) =>
      anciennesSelections.includes(identifiant)
        ? anciennesSelections.filter((id) => id !== identifiant)
        : [...anciennesSelections, identifiant]
    );
  }

  function basculerFavori(identifiant: number) {
    setFavoris((anciensFavoris) =>
      anciensFavoris.includes(identifiant)
        ? anciensFavoris.filter((id) => id !== identifiant)
        : [...anciensFavoris, identifiant]
    );
  }

  function toutDeselectionner() {
    setCartesSelectionnees([]);
  }

  async function supprimerCartesSelectionnees() {
    if (cartesSelectionnees.length === 0) return;

    const confirmation = confirm("Supprimer les cartes sélectionnées ?");
    if (!confirmation) return;

    const { error } = await supabase
      .from("cartes")
      .delete()
      .in("id", cartesSelectionnees);

    if (error) {
      alert(error.message);
      return;
    }

    setCartes((anciennesCartes) =>
      anciennesCartes.filter(
        (carte) => !cartesSelectionnees.includes(carte.identifiant)
      )
    );

    setHistoriquePrix((ancienHistorique) =>
      ancienHistorique.filter(
        (ligne) => !cartesSelectionnees.includes(ligne.carte_id)
      )
    );

    setFavoris((anciensFavoris) =>
      anciensFavoris.filter(
        (id) => !cartesSelectionnees.includes(id)
      )
    );

    setCartesSelectionnees([]);
  }


  function ouvrirGraphiqueCarte(identifiant: number) {
    setCarteGraphiqueId(identifiant);
    setGraphiqueAffiche("carte");

    setTimeout(() => {
      document
        .getElementById("zone-graphiques")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function ouvrirGraphiqueCollection() {
    setGraphiqueAffiche("collection");

    setTimeout(() => {
      document
        .getElementById("zone-graphiques")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function ouvrirGraphiqueEdition() {
    if (cartesSelectionnees.length !== 1) {
      alert("Sélectionne exactement une carte pour afficher son édition.");
      return;
    }

    const carteSelectionnee = cartes.find(
      (carte) => carte.identifiant === cartesSelectionnees[0]
    );

    if (!carteSelectionnee) return;

    setEditionGraphique(carteSelectionnee.edition);
    setGraphiqueAffiche("edition");

    setTimeout(() => {
      document
        .getElementById("zone-graphiques")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }


  function modifierCarteDirectement(identifiant: number) {
    const carte = cartes.find(
      (carteActuelle) => carteActuelle.identifiant === identifiant
    );

    if (!carte) return;

    setCarteEnModification({ ...carte });

    setTimeout(() => {
      document
        .getElementById("zone-modification")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function supprimerUneCarte(identifiant: number) {
    const carte = cartes.find(
      (carteActuelle) => carteActuelle.identifiant === identifiant
    );

    if (!carte) return;

    const confirmation = confirm(
      `Supprimer définitivement ${carte.nom} ?`
    );

    if (!confirmation) return;

    const { error } = await supabase
      .from("cartes")
      .delete()
      .eq("id", identifiant);

    if (error) {
      alert(error.message);
      return;
    }

    setCartes((anciennesCartes) =>
      anciennesCartes.filter(
        (carteActuelle) => carteActuelle.identifiant !== identifiant
      )
    );

    setHistoriquePrix((ancienHistorique) =>
      ancienHistorique.filter(
        (ligne) => ligne.carte_id !== identifiant
      )
    );

    setCartesSelectionnees((anciennesSelections) =>
      anciennesSelections.filter((id) => id !== identifiant)
    );

    setFavoris((anciensFavoris) =>
      anciensFavoris.filter((id) => id !== identifiant)
    );
  }

  function ouvrirModification() {
    if (cartesSelectionnees.length !== 1) {
      alert("Sélectionne exactement une carte à modifier.");
      return;
    }

    const carteSelectionnee = cartes.find(
      (carte) => carte.identifiant === cartesSelectionnees[0]
    );

    if (carteSelectionnee) {
      setCarteEnModification({ ...carteSelectionnee });

      setTimeout(() => {
        document
          .getElementById("zone-modification")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }

  async function enregistrerModification() {
    if (!carteEnModification) return;

    const prixNumerique = Number(carteEnModification.prix);

    if (
      !carteEnModification.nom.trim() ||
      !carteEnModification.edition.trim() ||
      Number.isNaN(prixNumerique) ||
      prixNumerique < 0
    ) {
      alert("Vérifie le nom, l'édition et le prix.");
      return;
    }

    const { error } = await supabase
      .from("cartes")
      .update({
        nom: carteEnModification.nom.trim(),
        edition: carteEnModification.edition.trim(),
        numero: carteEnModification.numero.trim(),
        type_carte: carteEnModification.type || "Sans type",
        etat: carteEnModification.etat,
        prix: prixNumerique,
        image: carteEnModification.image.trim(),
        id_api: carteEnModification.idApi.trim(),
        mise_a_jour_auto: carteEnModification.miseAJourAuto,
        proprietaire: carteEnModification.proprietaire,
      })
      .eq("id", carteEnModification.identifiant);

    if (error) {
      alert(error.message);
      return;
    }

    setCartes((anciennesCartes) =>
      anciennesCartes.map((carte) =>
        carte.identifiant === carteEnModification.identifiant
          ? { ...carteEnModification, prix: prixNumerique }
          : carte
      )
    );

    setCarteEnModification(null);
    alert("✅ Carte modifiée.");
  }

  function normaliserNomEdition(nomEdition: string) {
    return nomEdition
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  const ordreChronologiqueEditions: Record<string, number> = {
    "set de base": 199901,
    "jungle": 199906,
    "fossile": 199910,
    "team rocket": 200004,
    "neo genesis": 200012,
    "neo discovery": 200106,
    "neo revelation": 200110,
    "neo destiny": 200202,
    "expedition": 200209,
    "aquapolis": 200301,
    "skyridge": 200305,
    "ex rubis & saphir": 200307,
    "ex dragon": 200311,
    "ex deoxys": 200502,
    "ex createurs de legendes": 200602,
    "diamant & perle": 200705,
    "platine": 200902,
    "heartgold soulsilver": 201002,
    "noir & blanc": 201104,
    "xy": 201402,
    "promo xy": 201402,
    "promotions xy": 201402,
    "soleil et lune": 201702,
    "gardiens ascendants": 201705,
    "tonnerre perdu": 201811,
    "duo de choc": 201902,
    "alliance infaillible": 201905,
    "epee et bouclier": 202002,
    "regne de glace": 202106,
    "stars etincelantes": 202202,
    "astres radieux": 202205,
    "astres radieux galerie de dresseurs": 202205,
    "origine perdue": 202209,
    "tempete argentee": 202211,
    "ecarlate et violet": 202303,
    "evolutions a paldea": 202306,
    "151": 202309,
    "faille paradoxe": 202311,
    "destinees de paldea": 202401,
    "mascarade crepusculaire": 202405,
    "fable nebuleuse": 202408,
    "couronne stellaire": 202409,
    "etincelles deferlantes": 202411,
    "evolutions prismatiques": 202501,
    "rivalites destinees": 202505,
    "foudre noire": 202507,
    "flamme blanche": 202507,
    "promotions svp black star": 202599,
    "svp black star promos": 202599,
    "promo svp black star": 202599,
  };

  function rangChronologiqueEdition(nomEdition: string) {
    const nomNormalise = normaliserNomEdition(nomEdition);

    if (ordreChronologiqueEditions[nomNormalise] !== undefined) {
      return ordreChronologiqueEditions[nomNormalise];
    }

    const correspondance = Object.entries(ordreChronologiqueEditions)
      .filter(([nomConnu]) => nomNormalise.includes(nomConnu))
      .sort((a, b) => b[0].length - a[0].length)[0];

    return correspondance?.[1] ?? 999999;
  }

  function informationsBlocEdition(nomEdition: string) {
    const rang = rangChronologiqueEdition(nomEdition);
    const annee = Math.floor(rang / 100);

    if (annee >= 2023) {
      return {
        nom: "Écarlate et Violet",
        logo: "https://assets.tcgdex.net/en/sv/sv01/logo.webp",
        fond: "from-red-950/55 via-violet-950/35 to-slate-900",
        bordure: "border-violet-400/35",
        texte: "text-violet-200",
      };
    }

    if (annee >= 2020) {
      return {
        nom: "Épée et Bouclier",
        logo: "https://assets.tcgdex.net/en/swsh/swsh1/logo.webp",
        fond: "from-blue-950/55 via-pink-950/25 to-slate-900",
        bordure: "border-blue-400/35",
        texte: "text-blue-200",
      };
    }

    if (annee >= 2017) {
      return {
        nom: "Soleil et Lune",
        logo: "https://assets.tcgdex.net/en/sm/sm1/logo.webp",
        fond: "from-yellow-950/45 via-purple-950/30 to-slate-900",
        bordure: "border-yellow-400/35",
        texte: "text-yellow-200",
      };
    }

    if (annee >= 2014) {
      return {
        nom: "XY",
        logo: "https://assets.tcgdex.net/en/xy/xy1/logo.webp",
        fond: "from-blue-950/50 via-red-950/25 to-slate-900",
        bordure: "border-cyan-400/35",
        texte: "text-cyan-200",
      };
    }

    if (annee >= 2011) {
      return {
        nom: "Noir et Blanc",
        logo: "https://assets.tcgdex.net/en/bw/bw1/logo.webp",
        fond: "from-slate-700/55 via-slate-950 to-slate-900",
        bordure: "border-slate-300/35",
        texte: "text-slate-200",
      };
    }

    if (annee >= 2007) {
      return {
        nom: "Diamant et Perle",
        logo: "https://assets.tcgdex.net/en/dp/dp1/logo.webp",
        fond: "from-cyan-950/45 via-violet-950/25 to-slate-900",
        bordure: "border-cyan-300/35",
        texte: "text-cyan-100",
      };
    }

    if (annee >= 2003) {
      return {
        nom: "EX",
        logo: "https://assets.tcgdex.net/en/ex/ex1/logo.webp",
        fond: "from-orange-950/45 via-red-950/20 to-slate-900",
        bordure: "border-orange-400/35",
        texte: "text-orange-200",
      };
    }

    return {
      nom: "Wizards / Classique",
      logo: "https://assets.tcgdex.net/en/base/base1/logo.webp",
      fond: "from-yellow-950/40 via-blue-950/25 to-slate-900",
      bordure: "border-yellow-300/35",
      texte: "text-yellow-100",
    };
  }

  const cartesFiltrees = cartesCollection
    .filter((carte) => {
      const texteRecherche = recherche.trim().toLowerCase();

      const correspondRecherche =
        texteRecherche === "" ||
        carte.nom.toLowerCase().includes(texteRecherche) ||
        carte.edition.toLowerCase().includes(texteRecherche) ||
        carte.numero.toLowerCase().includes(texteRecherche) ||
        carte.type.toLowerCase().includes(texteRecherche) ||
        carte.etat.toLowerCase().includes(texteRecherche);

      const correspondType =
        filtreType === "" || carte.type === filtreType;

      return correspondRecherche && correspondType;
    })
    .sort((a, b) => {
      if (tri === "edition-chronologique") {
        const differenceEdition =
          rangChronologiqueEdition(a.edition) -
          rangChronologiqueEdition(b.edition);

        if (differenceEdition !== 0) return differenceEdition;

        const numeroTexteA = (a.numero || "").trim();
        const numeroTexteB = (b.numero || "").trim();

        const premierNombreA = Number(
          numeroTexteA.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER
        );

        const premierNombreB = Number(
          numeroTexteB.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER
        );

        if (premierNombreA !== premierNombreB) {
          return premierNombreA - premierNombreB;
        }

        const comparaisonNumero = numeroTexteA.localeCompare(
          numeroTexteB,
          "fr",
          {
            numeric: true,
            sensitivity: "base",
          }
        );

        if (comparaisonNumero !== 0) return comparaisonNumero;

        return a.nom.localeCompare(b.nom, "fr");
      }

      if (tri === "prix-croissant") return a.prix - b.prix;
      if (tri === "prix-decroissant") return b.prix - a.prix;
      if (tri === "edition") return a.edition.localeCompare(b.edition, "fr");
      if (tri === "nom-z-a") return b.nom.localeCompare(a.nom, "fr");
      return a.nom.localeCompare(b.nom, "fr");
    });

  const typesDresseur = [
  "dresseur",
  "trainer",
  "supporter",
  "objet",
  "outil",
  "outil pokemon",
  "stade",
];

const typesEnergie = [
  "energie",
  "energie feu",
  "energie eau",
  "energie plante",
  "energie electrique",
  "energie psy",
  "energie combat",
  "energie obscurite",
  "energie metal",
  "energie fee",
  "energie speciale",
];

function normaliserTypeCarte(typeCarte: string) {
  return typeCarte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const cartesDresseurs = cartesFiltrees.filter((carte) => {
  const typeNormalise = normaliserTypeCarte(carte.type);

  return (
    typeNormalise.startsWith("dresseur") ||
    typesDresseur.includes(typeNormalise)
  );
});

const cartesEnergies = cartesFiltrees.filter((carte) => {
  const typeNormalise = normaliserTypeCarte(carte.type);

  return (
    typeNormalise.startsWith("energie") ||
    typesEnergie.includes(typeNormalise)
  );
});

const cartesPokemon = cartesFiltrees.filter((carte) => {
  const typeNormalise = normaliserTypeCarte(carte.type);

  const estDresseur =
    typeNormalise.startsWith("dresseur") ||
    typesDresseur.includes(typeNormalise);

  const estEnergie =
    typeNormalise.startsWith("energie") ||
    typesEnergie.includes(typeNormalise);

  return !estDresseur && !estEnergie;
});

const nombreDresseurs = cartesCollection.filter((carte) => {
  const typeNormalise = normaliserTypeCarte(carte.type);

  return (
    typeNormalise.startsWith("dresseur") ||
    typesDresseur.includes(typeNormalise)
  );
}).length;

const nombreEnergies = cartesCollection.filter((carte) => {
  const typeNormalise = normaliserTypeCarte(carte.type);

  return (
    typeNormalise.startsWith("energie") ||
    typesEnergie.includes(typeNormalise)
  );
}).length;

const nombrePokemon = cartesCollection.length - nombreDresseurs - nombreEnergies;

  const cartesParEdition = Object.entries(
    cartesFiltrees.reduce<Record<string, Carte[]>>((groupes, carte) => {
      const nomEdition = carte.edition || "Sans édition";

      if (!groupes[nomEdition]) {
        groupes[nomEdition] = [];
      }

      groupes[nomEdition].push(carte);
      return groupes;
    }, {})
  ).sort(([editionA], [editionB]) => {
    const difference =
      rangChronologiqueEdition(editionA) -
      rangChronologiqueEdition(editionB);

    if (difference !== 0) return difference;

    return editionA.localeCompare(editionB, "fr");
  });

  useEffect(() => {
    if (
      cartesParEdition.length > 0 &&
      editionsOuvertes.length === 0
    ) {
      setEditionsOuvertes([cartesParEdition[0][0]]);
    }
    // L'ouverture automatique ne doit se faire qu'après le premier chargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartesCollection.length, collectionActive]);

const valeurCollection = cartesCollection.reduce((total, carte) => {
  const prixCarte = Number(carte.prix);

  return total + (Number.isNaN(prixCarte) ? 0 : prixCarte);
}, 0);

  const cartePlusChere =
    cartesCollection.length > 0
      ? cartesCollection.reduce((plusChere, carte) =>
          Number(carte.prix) > Number(plusChere.prix) ? carte : plusChere
        )
      : null;

  const top5CartesPlusCheres = [...cartesCollection]
    .sort((a, b) => Number(b.prix) - Number(a.prix))
    .slice(0, 5);

 const statistiquesParType = cartesCollection.reduce<
  Record<string, { nombre: number; valeur: number }>
>((statistiques, carte) => {
  const typeCarte = carte.type || "Sans type";
  const prixCarte = Number(carte.prix) || 0;

  if (!statistiques[typeCarte]) {
    statistiques[typeCarte] = {
      nombre: 0,
      valeur: 0,
    };
  }

  statistiques[typeCarte].nombre += 1;
  statistiques[typeCarte].valeur += prixCarte;

  return statistiques;
}, {});


  const debutAujourdhui = new Date();
  debutAujourdhui.setHours(0, 0, 0, 0);

  const historiqueAujourdhui = historiquePrix.filter(
    (ligne) => new Date(ligne.date_releve) >= debutAujourdhui
  );

  const premiereValeurParCarte = new Map<number, number>();

  historiqueAujourdhui.forEach((ligne) => {
    if (!premiereValeurParCarte.has(ligne.carte_id)) {
      premiereValeurParCarte.set(ligne.carte_id, ligne.prix);
    }
  });

  const valeurDebutJour = cartesCollection.reduce(
    (total, carte) =>
      total +
      (premiereValeurParCarte.get(carte.identifiant) ?? carte.prix),
    0
  );

  const evolutionAujourdhui = valeurCollection - valeurDebutJour;

  const variationsCartes = cartesCollection
    .map((carte) => {
      const historiqueCarte = historiquePrix
        .filter((ligne) => ligne.carte_id === carte.identifiant)
        .sort(
          (a, b) =>
            new Date(a.date_releve).getTime() -
            new Date(b.date_releve).getTime()
        );

      if (historiqueCarte.length < 2) return null;

      const prixPrecedent = historiqueCarte[historiqueCarte.length - 2].prix;
      const prixActuel = historiqueCarte[historiqueCarte.length - 1].prix;

      return {
        carte,
        prixPrecedent,
        prixActuel,
        variation: prixActuel - prixPrecedent,
      };
    })
    .filter(
      (
        variation
      ): variation is {
        carte: Carte;
        prixPrecedent: number;
        prixActuel: number;
        variation: number;
      } => variation !== null
    );

  const cartesAyantEvolue = variationsCartes
    .filter((variation) => Math.abs(variation.variation) >= 0.005)
    .sort(
      (a, b) =>
        Math.abs(b.variation) - Math.abs(a.variation)
    );

  const cartesAyantAugmente = cartesAyantEvolue
    .filter((variation) => variation.variation > 0)
    .sort((a, b) => b.variation - a.variation);

  const cartesAyantBaisse = cartesAyantEvolue
    .filter((variation) => variation.variation < 0)
    .sort((a, b) => a.variation - b.variation);

  const plusForteHausse =
    variationsCartes.length > 0
      ? variationsCartes.reduce((maximum, variationActuelle) =>
          variationActuelle.variation > maximum.variation
            ? variationActuelle
            : maximum
        )
      : null;

  const plusForteBaisse =
    variationsCartes.length > 0
      ? variationsCartes.reduce((minimum, variationActuelle) =>
          variationActuelle.variation < minimum.variation
            ? variationActuelle
            : minimum
        )
      : null;

      const stylesParType: Record<
  string,
  {
    emoji: string;
    fond: string;
    bordure: string;
    barre: string;
    texte: string;
  }
> = {
  Feu: {
    emoji: "🔥",
    fond: "from-red-950/70 to-slate-900",
    bordure: "border-red-400/30",
    barre: "bg-red-500",
    texte: "text-red-300",
  },
  Eau: {
    emoji: "💧",
    fond: "from-blue-950/70 to-slate-900",
    bordure: "border-blue-400/30",
    barre: "bg-blue-500",
    texte: "text-blue-300",
  },
  Plante: {
    emoji: "🌿",
    fond: "from-green-950/70 to-slate-900",
    bordure: "border-green-400/30",
    barre: "bg-green-500",
    texte: "text-green-300",
  },
  Électrique: {
    emoji: "⚡",
    fond: "from-yellow-950/60 to-slate-900",
    bordure: "border-yellow-400/30",
    barre: "bg-yellow-400",
    texte: "text-yellow-300",
  },
  Psy: {
    emoji: "🧠",
    fond: "from-pink-950/60 to-slate-900",
    bordure: "border-pink-400/30",
    barre: "bg-pink-500",
    texte: "text-pink-300",
  },
  Combat: {
    emoji: "🥊",
    fond: "from-orange-950/60 to-slate-900",
    bordure: "border-orange-400/30",
    barre: "bg-orange-500",
    texte: "text-orange-300",
  },
  Dragon: {
    emoji: "🐉",
    fond: "from-indigo-950/70 to-slate-900",
    bordure: "border-indigo-400/30",
    barre: "bg-indigo-500",
    texte: "text-indigo-300",
  },
  Glace: {
    emoji: "❄️",
    fond: "from-cyan-950/60 to-slate-900",
    bordure: "border-cyan-400/30",
    barre: "bg-cyan-400",
    texte: "text-cyan-300",
  },
  Ténèbres: {
    emoji: "🌑",
    fond: "from-gray-950 to-slate-900",
    bordure: "border-gray-400/30",
    barre: "bg-gray-500",
    texte: "text-gray-300",
  },
  Métal: {
    emoji: "⚙️",
    fond: "from-slate-700/70 to-slate-900",
    bordure: "border-slate-300/30",
    barre: "bg-slate-300",
    texte: "text-slate-200",
  },
  Fée: {
    emoji: "🧚",
    fond: "from-rose-950/60 to-slate-900",
    bordure: "border-rose-300/30",
    barre: "bg-rose-400",
    texte: "text-rose-300",
  },
  Poison: {
    emoji: "☠️",
    fond: "from-purple-950/70 to-slate-900",
    bordure: "border-purple-400/30",
    barre: "bg-purple-500",
    texte: "text-purple-300",
  },
  Spectre: {
    emoji: "👻",
    fond: "from-violet-950/70 to-slate-900",
    bordure: "border-violet-400/30",
    barre: "bg-violet-500",
    texte: "text-violet-300",
  },
  Insecte: {
    emoji: "🐛",
    fond: "from-lime-950/60 to-slate-900",
    bordure: "border-lime-400/30",
    barre: "bg-lime-500",
    texte: "text-lime-300",
  },
  Vol: {
    emoji: "🕊️",
    fond: "from-sky-950/60 to-slate-900",
    bordure: "border-sky-400/30",
    barre: "bg-sky-500",
    texte: "text-sky-300",
  },
  Incolore: {
    emoji: "⭐",
    fond: "from-slate-700/70 to-slate-900",
    bordure: "border-white/20",
    barre: "bg-slate-300",
    texte: "text-white",
  },
};

  return (

   <main
    className={`min-h-screen px-3 py-4 text-white transition-colors duration-500 sm:p-8 ${
      collectionActive === "Timothée"
        ? "bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.28),_rgba(2,6,23,0.98)_48%)]"
        : "bg-[radial-gradient(circle_at_top,_rgba(147,51,234,0.32),_rgba(24,5,43,0.98)_48%)]"
    }`}
  >
  <HeaderPokemon
    totalCartes={cartesCollection.length}
    valeurCollection={valeurCollection}
  />

  <section className="mx-auto mb-8 mt-4 w-full max-w-5xl">
    <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-slate-950/55 p-2 shadow-2xl backdrop-blur-xl sm:gap-5 sm:p-3">
      <button
        type="button"
        onClick={() => setCollectionActive("Timothée")}
        className={`rounded-2xl border px-3 py-4 text-center transition duration-300 sm:px-6 sm:py-5 ${
          collectionActive === "Timothée"
            ? "border-blue-300/70 bg-gradient-to-br from-blue-600 to-cyan-700 text-white shadow-xl shadow-blue-950/40"
            : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-blue-400/50 hover:bg-slate-800"
        }`}
      >
        <span className="block text-sm font-black sm:text-xl">
          👤 Collection de Timothée
        </span>
        <span className="mt-2 block text-xs font-semibold opacity-80 sm:text-sm">
          🃏 {nombreCartesTimothee} carte{nombreCartesTimothee > 1 ? "s" : ""}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setCollectionActive("Valentin")}
        className={`rounded-2xl border px-3 py-4 text-center transition duration-300 sm:px-6 sm:py-5 ${
          collectionActive === "Valentin"
            ? "border-violet-300/70 bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white shadow-xl shadow-violet-950/40"
            : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-violet-400/50 hover:bg-slate-800"
        }`}
      >
        <span className="block text-sm font-black sm:text-xl">
          👤 Collection de Valentin
        </span>
        <span className="mt-2 block text-xs font-semibold opacity-80 sm:text-sm">
          🃏 {nombreCartesValentin} carte{nombreCartesValentin > 1 ? "s" : ""}
        </span>
      </button>
    </div>

    <p className="mt-3 text-center text-sm font-bold text-slate-300">
      Collection active :{" "}
      <span
        className={
          collectionActive === "Timothée"
            ? "text-blue-300"
            : "text-violet-300"
        }
      >
        {collectionActive}
      </span>
    </p>
  </section>

  <Notification
    message={messageNotification}
    visible={notificationVisible}
  />
     

      <Formulaire
        nom={nom}
        setNom={setNom}
        edition={edition}
        setEdition={setEdition}
        numero={numero}
        setNumero={setNumero}
        type={type}
        setType={setType}
        etat={etat}
        setEtat={setEtat}
        prix={prix}
        setPrix={setPrix}
        image={image}
        setImage={setImage}
        idApi={idApi}
        setIdApi={setIdApi}
        proprietaire={proprietaireCarte}
        setProprietaire={setProprietaireCarte}
        onEnregistrer={ajouterCarte}
      />

<section className="mt-14">
  <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-300">
        Vue d’ensemble
      </p>

      <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
        📊 Tableau de bord
      </h2>
    </div>

    <p className="text-sm text-slate-400">
      Les informations principales de ta collection
    </p>
  </div>

  {/* Statistiques principales */}
  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
    {/* Nombre de cartes */}
    <div className="group relative overflow-hidden rounded-3xl border border-blue-400/20 bg-slate-800/90 p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-blue-400/60 hover:shadow-blue-950/50">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Nombre de cartes
          </p>

          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-2xl">
            📦
          </span>
        </div>

        <p className="mt-5 text-4xl font-black text-white">
          {cartesCollection.length}
        </p>

        <p className="mt-2 text-sm text-slate-400">
          {cartes.length > 1
            ? "cartes dans la collection"
            : "carte dans la collection"}
        </p>
      </div>
    </div>

    {/* Valeur totale */}
    <div className="group relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-slate-800/90 p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-yellow-400/60 hover:shadow-yellow-950/30">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-400/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Valeur totale
          </p>

          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/15 text-2xl">
            💰
          </span>
        </div>

        <p className="mt-5 text-4xl font-black text-yellow-300">
          {valeurCollection.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Valeur actuelle de la collection
        </p>
      </div>
    </div>

    {/* Prix moyen */}
    <div className="group relative overflow-hidden rounded-3xl border border-violet-400/20 bg-slate-800/90 p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-violet-400/60 hover:shadow-violet-950/40">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Prix moyen
          </p>

          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-2xl">
            🧮
          </span>
        </div>

        <p className="mt-5 text-4xl font-black text-white">
          {(cartesCollection.length > 0
            ? valeurCollection / cartesCollection.length
            : 0
          ).toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Valeur moyenne d’une carte
        </p>
      </div>
    </div>

    {/* Évolution aujourd’hui */}
    <div
      className={`group relative overflow-hidden rounded-3xl border bg-slate-800/90 p-6 shadow-xl transition duration-300 hover:-translate-y-1 ${
        evolutionAujourdhui > 0
          ? "border-green-400/20 hover:border-green-400/60 hover:shadow-green-950/40"
          : evolutionAujourdhui < 0
            ? "border-red-400/20 hover:border-red-400/60 hover:shadow-red-950/40"
            : "border-slate-500/30 hover:border-slate-400/60"
      }`}
    >
      <div
        className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${
          evolutionAujourdhui > 0
            ? "bg-green-500/10"
            : evolutionAujourdhui < 0
              ? "bg-red-500/10"
              : "bg-slate-500/10"
        }`}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Aujourd’hui
          </p>

          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-2xl">
            {evolutionAujourdhui > 0
              ? "📈"
              : evolutionAujourdhui < 0
                ? "📉"
                : "➖"}
          </span>
        </div>

        <p
          className={`mt-5 text-4xl font-black ${
            evolutionAujourdhui > 0
              ? "text-green-400"
              : evolutionAujourdhui < 0
                ? "text-red-400"
                : "text-slate-300"
          }`}
        >
          {evolutionAujourdhui > 0 ? "+" : ""}
          {evolutionAujourdhui.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Depuis le premier relevé du jour
        </p>
      </div>
    </div>
  </div>

  {/* Catégories principales */}
  <div className="mt-5 grid gap-5 sm:grid-cols-3">
    <div className="group relative overflow-hidden rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-slate-800 to-cyan-950/30 p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:shadow-cyan-950/40">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Nombre d’énergies
          </p>

          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/15 text-2xl">
            ⚪
          </span>
        </div>

        <p className="mt-5 text-4xl font-black text-cyan-100">
          {nombreEnergies}
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Carte{nombreEnergies > 1 ? "s" : ""} Énergie
        </p>
      </div>
    </div>

    <div className="group relative overflow-hidden rounded-3xl border border-yellow-400/25 bg-gradient-to-br from-slate-800 to-amber-950/30 p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-yellow-300/60 hover:shadow-amber-950/40">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-400/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Nombre de dresseurs
          </p>

          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/15 text-2xl">
            🧑‍🏫
          </span>
        </div>

        <p className="mt-5 text-4xl font-black text-yellow-300">
          {nombreDresseurs}
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Carte{nombreDresseurs > 1 ? "s" : ""} Dresseur
        </p>
      </div>
    </div>

    <div className="group relative overflow-hidden rounded-3xl border border-blue-400/25 bg-gradient-to-br from-slate-800 to-blue-950/35 p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-blue-300/60 hover:shadow-blue-950/50">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Nombre de Pokémon
          </p>

          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-2xl">
            ⚡
          </span>
        </div>

        <p className="mt-5 text-4xl font-black text-blue-200">
          {nombrePokemon}
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Carte{nombrePokemon > 1 ? "s" : ""} Pokémon
        </p>
      </div>
    </div>
  </div>

  {/* Cartes importantes */}
  <div className="mt-7 grid gap-6 lg:grid-cols-3">
    {/* Plus forte hausse */}
    <div className="group relative min-h-72 overflow-hidden rounded-3xl border border-green-400/20 bg-gradient-to-br from-slate-800 to-green-950/30 p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-green-400/60 hover:shadow-green-950/40">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-green-500/10 blur-3xl" />

      {plusForteHausse && plusForteHausse.variation > 0 ? (
        <div className="relative flex h-full items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-wider text-green-300">
              📈 Plus forte hausse
            </p>

            <h3 className="mt-5 text-2xl font-black leading-tight text-white">
              {plusForteHausse.carte.nom}
            </h3>

            <p className="mt-4 text-4xl font-black text-green-400">
              +{plusForteHausse.variation.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>

            <p className="mt-3 text-sm text-slate-400">
              Meilleure progression enregistrée
            </p>
          </div>

          {plusForteHausse.carte.image ? (
            <div className="shrink-0 rounded-2xl bg-white/5 p-2 shadow-lg">
              <img
                src={plusForteHausse.carte.image}
                alt={plusForteHausse.carte.nom}
                className="h-44 w-32 rounded-xl object-contain transition duration-300 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="flex h-44 w-32 shrink-0 items-center justify-center rounded-2xl bg-slate-700 text-center text-sm text-slate-400">
              Image indisponible
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex h-full flex-col justify-center">
          <p className="text-sm font-bold uppercase tracking-wider text-green-300">
            📈 Plus forte hausse
          </p>

          <p className="mt-5 text-lg text-slate-400">
            Aucune hausse enregistrée pour le moment.
          </p>
        </div>
      )}
    </div>

    {/* Plus forte baisse */}
    <div className="group relative min-h-72 overflow-hidden rounded-3xl border border-red-400/20 bg-gradient-to-br from-slate-800 to-red-950/30 p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-red-400/60 hover:shadow-red-950/40">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-red-500/10 blur-3xl" />

      {plusForteBaisse && plusForteBaisse.variation < 0 ? (
        <div className="relative flex h-full items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-wider text-red-300">
              📉 Plus forte baisse
            </p>

            <h3 className="mt-5 text-2xl font-black leading-tight text-white">
              {plusForteBaisse.carte.nom}
            </h3>

            <p className="mt-4 text-4xl font-black text-red-400">
              {plusForteBaisse.variation.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>

            <p className="mt-3 text-sm text-slate-400">
              Plus forte diminution enregistrée
            </p>
          </div>

          {plusForteBaisse.carte.image ? (
            <div className="shrink-0 rounded-2xl bg-white/5 p-2 shadow-lg">
              <img
                src={plusForteBaisse.carte.image}
                alt={plusForteBaisse.carte.nom}
                className="h-44 w-32 rounded-xl object-contain transition duration-300 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="flex h-44 w-32 shrink-0 items-center justify-center rounded-2xl bg-slate-700 text-center text-sm text-slate-400">
              Image indisponible
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex h-full flex-col justify-center">
          <p className="text-sm font-bold uppercase tracking-wider text-red-300">
            📉 Plus forte baisse
          </p>

          <p className="mt-5 text-lg text-slate-400">
            Aucune baisse enregistrée pour le moment.
          </p>
        </div>
      )}
    </div>

    {/* Carte la plus chère */}
    <div className="group relative min-h-72 overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-slate-800 to-yellow-950/20 p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-yellow-400/60 hover:shadow-yellow-950/30">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-yellow-400/10 blur-3xl" />

      {cartePlusChere ? (
        <div className="relative flex h-full items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-wider text-yellow-300">
              🏆 Carte la plus chère
            </p>

            <h3 className="mt-5 text-2xl font-black leading-tight text-white">
              {cartePlusChere.nom}
            </h3>

            <p className="mt-4 text-4xl font-black text-yellow-300">
              {Number(cartePlusChere.prix).toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>

            <p className="mt-3 text-sm text-slate-400">
              Carte ayant la plus grande valeur
            </p>
          </div>

          {cartePlusChere.image ? (
            <div className="shrink-0 rounded-2xl bg-white/5 p-2 shadow-lg">
              <img
                src={cartePlusChere.image}
                alt={cartePlusChere.nom}
                className="h-44 w-32 rounded-xl object-contain transition duration-300 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="flex h-44 w-32 shrink-0 items-center justify-center rounded-2xl bg-slate-700 text-center text-sm text-slate-400">
              Image indisponible
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex h-full flex-col justify-center">
          <p className="text-sm font-bold uppercase tracking-wider text-yellow-300">
            🏆 Carte la plus chère
          </p>

          <p className="mt-5 text-lg text-slate-400">
            Aucune carte dans la collection.
          </p>
        </div>
      )}
    </div>
  </div>
</section>

<section className="mt-14 overflow-hidden rounded-3xl border border-yellow-400/20 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl sm:p-8">
  <div className="mb-7">
    <p className="text-sm font-bold uppercase tracking-[0.22em] text-yellow-300">
      Classement de la collection
    </p>

    <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
      🏆 Top 5 des cartes les plus chères
    </h2>

    <p className="mt-2 text-slate-400">
      Les cinq cartes qui ont actuellement le plus de valeur.
    </p>
  </div>

  {top5CartesPlusCheres.length === 0 ? (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-400">
      Aucune carte dans la collection.
    </div>
  ) : (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-5">
      {top5CartesPlusCheres.map((carte, index) => (
        <article
          key={carte.identifiant}
          className="group relative flex h-full min-w-[82vw] snap-center flex-col overflow-hidden rounded-3xl sm:min-w-0 border border-yellow-400/20 bg-gradient-to-br from-slate-800 to-yellow-950/20 p-5 shadow-xl transition duration-300 hover:-translate-y-2 hover:border-yellow-300/60 hover:shadow-2xl"
        >
          <div className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-yellow-300/40 bg-yellow-400/15 text-lg font-black text-yellow-300">
            {index + 1}
          </div>

          <div className="flex h-52 items-center justify-center rounded-2xl bg-slate-950/40 p-3">
            {carte.image ? (
              <img
                src={carte.image}
                alt={carte.nom}
                className="h-full w-full rounded-xl object-contain transition duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="text-center text-sm text-slate-400">
                Image indisponible
              </span>
            )}
          </div>

          <h3 className="mt-5 min-h-14 text-xl font-black leading-tight text-white">
            {carte.nom}
          </h3>

          <p className="mt-2 min-h-12 text-sm text-slate-400">
            {carte.edition}
          </p>

          <p className="mt-auto pt-4 text-3xl font-black text-yellow-300">
            {Number(carte.prix).toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            €
          </p>

          <button
            type="button"
            onClick={() => basculerFavori(carte.identifiant)}
            className={`mt-4 w-full rounded-xl border px-4 py-3 font-bold transition ${
              favoris.includes(carte.identifiant)
                ? "border-yellow-300/60 bg-yellow-400/20 text-yellow-200"
                : "border-slate-600 bg-slate-900/60 text-slate-300 hover:border-yellow-300/50 hover:text-yellow-200"
            }`}
          >
            {favoris.includes(carte.identifiant)
              ? "★ Dans les favoris"
              : "☆ Ajouter aux favoris"}
          </button>
        </article>
      ))}
    </div>
  )}
</section>

<section className="mt-14">
  <div className="mb-7">
    <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">
      Mouvements de prix
    </p>

    <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
      📊 Évolution des cartes
    </h2>

    <p className="mt-2 text-slate-400">
      Les cartes sont séparées selon leur dernière hausse ou leur dernière baisse.
    </p>
  </div>

  <div className="grid gap-7 xl:grid-cols-2">
    {/* Cartes en hausse */}
    <div className="overflow-hidden rounded-3xl border border-green-400/25 bg-gradient-to-br from-slate-900 via-slate-900 to-green-950/30 p-4 shadow-2xl shadow-green-950/20 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-300">
            Progressions
          </p>

          <h3 className="mt-2 text-2xl font-black text-white">
            📈 Cartes ayant augmenté
          </h3>
        </div>

        <span className="rounded-full border border-green-300/30 bg-green-400/10 px-4 py-2 text-sm font-black text-green-300">
          {cartesAyantAugmente.length}
        </span>
      </div>

      {cartesAyantAugmente.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-8 text-center text-slate-400">
          Aucune hausse enregistrée pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {cartesAyantAugmente.map(
            ({ carte, prixPrecedent, prixActuel, variation }) => (
              <article
                key={carte.identifiant}
                className="group rounded-2xl border border-green-400/20 bg-slate-800/85 p-4 transition duration-300 hover:-translate-y-1 hover:border-green-300/60 hover:shadow-xl hover:shadow-green-950/30"
              >
                <div className="flex gap-4">
                  <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950/60 p-2">
                    {carte.image ? (
                      <img
                        src={carte.image}
                        alt={carte.nom}
                        className="h-full w-full rounded-lg object-contain transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-center text-xs text-slate-500">
                        Image indisponible
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-xl font-black text-white">
                      {carte.nom}
                    </h4>

                    <p className="mt-1 text-sm text-slate-400">
                      {carte.edition}
                    </p>

                    <p className="mt-3 text-3xl font-black text-green-400">
                      +{variation.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950/45 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Avant
                    </p>

                    <p className="mt-1 font-black text-slate-200">
                      {prixPrecedent.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-950/30 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-green-300/70">
                      Maintenant
                    </p>

                    <p className="mt-1 font-black text-green-300">
                      {prixActuel.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => ouvrirGraphiqueCarte(carte.identifiant)}
                  className="mt-4 w-full rounded-xl border border-green-300/25 bg-green-400/10 px-4 py-3 font-bold text-green-100 transition hover:border-green-300/60 hover:bg-green-400/20"
                >
                  📊 Voir son graphique
                </button>
              </article>
            )
          )}
        </div>
      )}
    </div>

    {/* Cartes en baisse */}
    <div className="overflow-hidden rounded-3xl border border-red-400/25 bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/30 p-4 shadow-2xl shadow-red-950/20 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-300">
            Diminutions
          </p>

          <h3 className="mt-2 text-2xl font-black text-white">
            📉 Cartes ayant baissé
          </h3>
        </div>

        <span className="rounded-full border border-red-300/30 bg-red-400/10 px-4 py-2 text-sm font-black text-red-300">
          {cartesAyantBaisse.length}
        </span>
      </div>

      {cartesAyantBaisse.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-8 text-center text-slate-400">
          Aucune baisse enregistrée pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {cartesAyantBaisse.map(
            ({ carte, prixPrecedent, prixActuel, variation }) => (
              <article
                key={carte.identifiant}
                className="group rounded-2xl border border-red-400/20 bg-slate-800/85 p-4 transition duration-300 hover:-translate-y-1 hover:border-red-300/60 hover:shadow-xl hover:shadow-red-950/30"
              >
                <div className="flex gap-4">
                  <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950/60 p-2">
                    {carte.image ? (
                      <img
                        src={carte.image}
                        alt={carte.nom}
                        className="h-full w-full rounded-lg object-contain transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-center text-xs text-slate-500">
                        Image indisponible
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-xl font-black text-white">
                      {carte.nom}
                    </h4>

                    <p className="mt-1 text-sm text-slate-400">
                      {carte.edition}
                    </p>

                    <p className="mt-3 text-3xl font-black text-red-400">
                      {variation.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950/45 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Avant
                    </p>

                    <p className="mt-1 font-black text-slate-200">
                      {prixPrecedent.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-950/30 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-300/70">
                      Maintenant
                    </p>

                    <p className="mt-1 font-black text-red-300">
                      {prixActuel.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => ouvrirGraphiqueCarte(carte.identifiant)}
                  className="mt-4 w-full rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 font-bold text-red-100 transition hover:border-red-300/60 hover:bg-red-400/20"
                >
                  📊 Voir son graphique
                </button>
              </article>
            )
          )}
        </div>
      )}
    </div>
  </div>
</section>

<section className="mt-14 overflow-hidden rounded-3xl border border-blue-400/20 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl sm:p-8">
  <div className="mb-7">
    <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">
      Répartition de la collection
    </p>

    <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
      🏷️ Cartes par type
    </h2>

    <p className="mt-2 text-slate-400">
      Nombre de cartes, valeur et pourcentage pour chaque type.
    </p>
  </div>

  {Object.keys(statistiquesParType).length === 0 ? (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-400">
      Aucune statistique disponible.
    </div>
  ) : (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(statistiquesParType)
        .sort((a, b) => b[1].nombre - a[1].nombre)
        .map(([typeCarte, statistiques]) => {
          const style = stylesParType[typeCarte] ?? {
            emoji: "❔",
            fond: "from-slate-800 to-slate-900",
            bordure: "border-slate-500/30",
            barre: "bg-slate-400",
            texte: "text-slate-300",
          };

          const pourcentage =
            cartesCollection.length > 0
              ? (statistiques.nombre / cartesCollection.length) * 100
              : 0;

          return (
            <article
              key={typeCarte}
              className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-xl transition duration-300 hover:-translate-y-2 hover:shadow-2xl ${style.fond} ${style.bordure}`}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-2xl font-black ${style.texte}`}>
                      {typeCarte}
                    </p>

                    <p className="mt-2 text-slate-300">
                      {statistiques.nombre} carte
                      {statistiques.nombre > 1 ? "s" : ""}
                    </p>
                  </div>

                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-3xl shadow-inner">
                    {style.emoji}
                  </span>
                </div>

                <p className="mt-6 text-3xl font-black text-yellow-300">
                  {statistiques.valeur.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </p>

                <div className="mt-4 rounded-xl bg-slate-950/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Prix moyen du type
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    {(statistiques.nombre > 0
                      ? statistiques.valeur / statistiques.nombre
                      : 0
                    ).toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    Part de la collection
                  </span>

                  <span className="font-bold text-white">
                    {pourcentage.toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-950/70">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${style.barre}`}
                    style={{
                      width: `${Math.max(
                        pourcentage > 0 ? 4 : 0,
                        pourcentage
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </article>
          );
        })}
    </div>
  )}
</section>

<section className="mt-14 overflow-hidden rounded-3xl border border-violet-400/20 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl sm:p-8">
  <div className="mb-7">
    <p className="text-sm font-bold uppercase tracking-[0.22em] text-violet-300">
      Répartition de la collection
    </p>

    <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
      📚 Cartes par édition
    </h2>

    <p className="mt-2 text-slate-400">
      Nombre de cartes, valeur totale et prix moyen pour chaque édition.
    </p>
  </div>

  {Object.keys(statistiquesParEdition).length === 0 ? (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-400">
      Aucune statistique disponible.
    </div>
  ) : (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(statistiquesParEdition)
        .sort((a, b) => b[1].nombre - a[1].nombre)
        .map(([edition, statistiques], index) => {
          const prixMoyenEdition =
            statistiques.nombre > 0
              ? statistiques.valeur / statistiques.nombre
              : 0;

          const pourcentage =
            cartesCollection.length > 0
              ? (statistiques.nombre / cartesCollection.length) * 100
              : 0;

          const couleurs = [
            {
              fond: "from-violet-950/70 to-slate-900",
              bordure: "border-violet-400/30",
              texte: "text-violet-300",
              barre: "bg-violet-500",
            },
            {
              fond: "from-blue-950/70 to-slate-900",
              bordure: "border-blue-400/30",
              texte: "text-blue-300",
              barre: "bg-blue-500",
            },
            {
              fond: "from-pink-950/60 to-slate-900",
              bordure: "border-pink-400/30",
              texte: "text-pink-300",
              barre: "bg-pink-500",
            },
            {
              fond: "from-amber-950/60 to-slate-900",
              bordure: "border-amber-400/30",
              texte: "text-amber-300",
              barre: "bg-amber-500",
            },
          ];

          const style = couleurs[index % couleurs.length];

          return (
            <article
              key={edition}
              className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-xl transition duration-300 hover:-translate-y-2 hover:shadow-2xl ${style.fond} ${style.bordure}`}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`text-xl font-black leading-tight ${style.texte}`}>
                      {edition}
                    </p>

                    <p className="mt-2 text-slate-300">
                      {statistiques.nombre} carte
                      {statistiques.nombre > 1 ? "s" : ""}
                    </p>
                  </div>

                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-3xl shadow-inner">
                    📚
                  </span>
                </div>

                <p className="mt-6 text-3xl font-black text-yellow-300">
                  {statistiques.valeur.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950/40 p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Prix moyen de l’édition
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {prixMoyenEdition.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950/40 p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Collection
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {pourcentage.toLocaleString("fr-FR", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950/70">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${style.barre}`}
                    style={{
                      width: `${Math.max(
                        pourcentage > 0 ? 4 : 0,
                        pourcentage
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </article>
          );
        })}
    </div>
  )}
</section>

      <section className="mt-14 overflow-hidden rounded-3xl border border-blue-400/20 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl sm:p-7">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">
              Gestion de la collection
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              🎮 Actions rapides
            </h2>
          </div>

          <div className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300">
            {cartesSelectionnees.length === 0
              ? "Aucune carte sélectionnée"
              : cartesSelectionnees.length === 1
                ? "1 carte sélectionnée"
                : `${cartesSelectionnees.length} cartes sélectionnées`}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <button
            type="button"
            onClick={supprimerCartesSelectionnees}
            disabled={cartesSelectionnees.length === 0}
            className={`group flex min-h-20 items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-center font-bold transition duration-300 ${
              cartesSelectionnees.length === 0
                ? "cursor-not-allowed border-slate-700 bg-slate-800/70 text-slate-500"
                : "border-red-400/30 bg-red-500/15 text-red-100 hover:-translate-y-1 hover:border-red-300/70 hover:bg-red-500/25"
            }`}
          >
            <span className="text-2xl">🗑️</span>
            <span>Supprimer la sélection</span>
          </button>

          <button
            type="button"
            onClick={toutDeselectionner}
            disabled={cartesSelectionnees.length === 0}
            className={`group flex min-h-20 items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-center font-bold transition duration-300 ${
              cartesSelectionnees.length === 0
                ? "cursor-not-allowed border-slate-700 bg-slate-800/70 text-slate-500"
                : "border-slate-500/40 bg-slate-700/50 text-white hover:-translate-y-1 hover:border-slate-300/70 hover:bg-slate-700"
            }`}
          >
            <span className="text-2xl">❌</span>
            <span>Tout désélectionner</span>
          </button>

          <button
            type="button"
            onClick={mettreAJourPrix}
            disabled={miseAJourPrixEnCours}
            className={`group flex min-h-20 items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-center font-bold text-white transition duration-300 ${
              miseAJourPrixEnCours
                ? "cursor-wait border-slate-600 bg-slate-700"
                : "border-green-400/30 bg-green-500/20 hover:-translate-y-1 hover:border-green-300/70 hover:bg-green-500/30"
            }`}
          >
            <span className={`text-2xl ${miseAJourPrixEnCours ? "animate-spin" : ""}`}>
              🔄
            </span>

            <span>
              {miseAJourPrixEnCours
                ? "Mise à jour..."
                : "Mettre à jour les prix"}
            </span>
          </button>

          <button
            type="button"
            onClick={ouvrirGraphiqueCollection}
            className="group flex min-h-20 items-center justify-center gap-3 rounded-2xl border border-blue-400/30 bg-blue-500/20 px-4 py-4 text-center font-bold text-blue-100 transition duration-300 hover:-translate-y-1 hover:border-blue-300/70 hover:bg-blue-500/30"
          >
            <span className="text-2xl">📈</span>
            <span>Graphique collection</span>
          </button>

          <button
            type="button"
            onClick={ouvrirGraphiqueEdition}
            className="group flex min-h-20 items-center justify-center gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/20 px-4 py-4 text-center font-bold text-violet-100 transition duration-300 hover:-translate-y-1 hover:border-violet-300/70 hover:bg-violet-500/30"
          >
            <span className="text-2xl">📚</span>
            <span>Graphique édition</span>
          </button>

          <button
            type="button"
            onClick={ouvrirModification}
            className="group flex min-h-20 items-center justify-center gap-3 rounded-2xl border border-orange-400/30 bg-orange-500/20 px-4 py-4 text-center font-bold text-orange-100 transition duration-300 hover:-translate-y-1 hover:border-orange-300/70 hover:bg-orange-500/30"
          >
            <span className="text-2xl">✏️</span>
            <span>Modifier une carte</span>
          </button>
        </div>
      </section>

      {graphiqueAffiche && (
        <section id="zone-graphiques" className="scroll-mt-6 mt-8">
          <GraphiqueEvolution
            mode={graphiqueAffiche}
            cartes={cartesCollection}
            historiquePrix={historiquePrix}
            carteId={carteGraphiqueId}
            edition={editionGraphique}
            onFermer={() => setGraphiqueAffiche(null)}
          />
        </section>
      )}

      {carteEnModification && (
        <section
          id="zone-modification"
          className="scroll-mt-6 mt-8 rounded-2xl border border-orange-500 bg-slate-800 p-6"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">
              ✏️ Modifier {carteEnModification.nom}
            </h2>

            <button
              type="button"
              onClick={() => setCarteEnModification(null)}
              className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600"
            >
              Fermer
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="font-semibold">
              Nom
              <input
                value={carteEnModification.nom}
                onChange={(e) =>
                  setCarteEnModification({
                    ...carteEnModification,
                    nom: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>

            <label className="font-semibold">
              Édition
              <input
                value={carteEnModification.edition}
                onChange={(e) =>
                  setCarteEnModification({
                    ...carteEnModification,
                    edition: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>

            <label className="font-semibold">
              Numéro
              <input
                value={carteEnModification.numero}
                onChange={(e) =>
                  setCarteEnModification({
                    ...carteEnModification,
                    numero: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>

            <label className="font-semibold">
              Type
              <input
                value={carteEnModification.type}
                onChange={(e) =>
                  setCarteEnModification({
                    ...carteEnModification,
                    type: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>

            <label className="font-semibold">
              État
              <input
                value={carteEnModification.etat}
                onChange={(e) =>
                  setCarteEnModification({
                    ...carteEnModification,
                    etat: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>

            <label className="font-semibold">
              Prix (€)
              <input
                type="number"
                min="0"
                step="0.01"
                value={carteEnModification.prix}
                onChange={(e) =>
                  setCarteEnModification({
                    ...carteEnModification,
                    prix: Number(e.target.value),
                  })
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>

            <label className="font-semibold md:col-span-2">
              Adresse de l&apos;image
              <input
                value={carteEnModification.image}
                onChange={(e) =>
                  setCarteEnModification({
                    ...carteEnModification,
                    image: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>

            <label className="font-semibold md:col-span-2">
              Identifiant TCGdex
              <input
                value={carteEnModification.idApi}
                onChange={(e) =>
                  setCarteEnModification({
                    ...carteEnModification,
                    idApi: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={enregistrerModification}
              className="flex-1 rounded-xl bg-green-600 p-4 font-bold hover:bg-green-700"
            >
              💾 Enregistrer les modifications
            </button>

            <button
              type="button"
              onClick={() => setCarteEnModification(null)}
              className="flex-1 rounded-xl bg-slate-600 p-4 font-bold hover:bg-slate-500"
            >
              Annuler
            </button>
          </div>
        </section>
      )}

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/75 p-5 shadow-xl backdrop-blur-xl sm:p-7">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">
            Trouver rapidement une carte
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            🔎 Recherche et filtres
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block font-bold text-slate-200">
            ↕️ Trier les cartes

            <select
              value={tri}
              onChange={(e) => setTri(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-600 bg-slate-800 px-5 py-4 text-white outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
            >
              <option value="edition-chronologique">Édition : ancienne → récente</option>
              <option value="nom">Nom A → Z</option>
              <option value="nom-z-a">Nom Z → A</option>
              <option value="prix-croissant">Prix croissant</option>
              <option value="prix-decroissant">Prix décroissant</option>
              <option value="edition">Édition A → Z</option>
            </select>
          </label>

          <label className="block font-bold text-slate-200">
            🏷️ Filtrer par type

            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-600 bg-slate-800 px-5 py-4 text-white outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
            >
              <option value="">Tous les types</option>
              <option value="Dresseur">🧑‍🏫 Dresseur</option>
              <option value="Énergie">⚪ Énergie</option>
              <option value="Feu">🔥 Feu</option>
              <option value="Eau">💧 Eau</option>
              <option value="Plante">🌿 Plante</option>
              <option value="Électrique">⚡ Électrique</option>
              <option value="Psy">🧠 Psy</option>
              <option value="Combat">🥊 Combat</option>
              <option value="Dragon">🐉 Dragon</option>
              <option value="Fée">🧚 Fée</option>
              <option value="Glace">❄️ Glace</option>
              <option value="Insecte">🐛 Insecte</option>
              <option value="Métal">⚙️ Métal</option>
              <option value="Poison">☠️ Poison</option>
              <option value="Roche">🪨 Roche</option>
              <option value="Spectre">👻 Spectre</option>
              <option value="Ténèbres">🌑 Ténèbres</option>
              <option value="Vol">🕊️ Vol</option>
              <option value="Incolore">⭐ Incolore</option>
              <option value="Sans type">❔ Sans type</option>
            </select>
          </label>
        </div>

        <label className="relative mt-6 block">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl">
            🔍
          </span>

          <input
            type="text"
            placeholder="Rechercher par nom, édition, numéro, type ou état..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-2xl border border-slate-600 bg-slate-800 py-5 pl-14 pr-5 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
          />
        </label>

        <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/40 px-5 py-4 text-center sm:flex-row sm:text-left">
          <p className="text-lg font-bold text-white">
            {cartesFiltrees.length === 1
              ? "1 carte trouvée"
              : `${cartesFiltrees.length} cartes trouvées`}
          </p>

          {cartesSelectionnees.length > 0 && (
            <p className="rounded-full bg-yellow-400/15 px-4 py-2 font-bold text-yellow-300">
              {cartesSelectionnees.length === 1
                ? "1 carte sélectionnée"
                : `${cartesSelectionnees.length} cartes sélectionnées`}
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/80 p-2 shadow-xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setModeCollection("cartes")}
            className={`min-w-44 flex-1 rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
              modeCollection === "cartes"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            📚 Mes cartes
          </button>

          <button
            type="button"
            onClick={() => setModeCollection("editions")}
            className={`min-w-44 flex-1 rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
              modeCollection === "editions"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-950/40"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            🗂️ Mes éditions
          </button>

          <button
            type="button"
            onClick={() => setModeCollection("favoris")}
            className={`min-w-40 flex-1 rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
              modeCollection === "favoris"
                ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-950/30"
                : "text-slate-300 hover:bg-slate-800 hover:text-yellow-300"
            }`}
          >
            ⭐ Favoris
          </button>

          <button
            type="button"
            onClick={() => setModeCollection("dresseurs")}
            className={`min-w-44 flex-1 rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
              modeCollection === "dresseurs"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-950/40"
                : "text-slate-300 hover:bg-slate-800 hover:text-orange-300"
            }`}
          >
            🧑‍🏫 Mes Dresseurs
          </button>

          <button
            type="button"
            onClick={() => setModeCollection("energies")}
            className={`min-w-44 flex-1 rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
              modeCollection === "energies"
                ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/40"
                : "text-slate-300 hover:bg-slate-800 hover:text-cyan-300"
            }`}
          >
            ⚪ Mes Énergies
          </button>

          <button
            type="button"
            onClick={() => setModeCollection("pokemons")}
            className={`min-w-44 flex-1 rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
              modeCollection === "pokemons"
                ? "bg-green-600 text-white shadow-lg shadow-green-950/40"
                : "text-slate-300 hover:bg-slate-800 hover:text-green-300"
            }`}
          >
            ⚡ Mes Pokémon
          </button>
        </div>
      </section>

      {modeCollection === "cartes" && (
        <>
          <div className="mb-7 mt-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">
                Toute la collection
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
                📚 Mes cartes
              </h2>
            </div>

            <p className="text-slate-400">
              {cartesFiltrees.length} carte
              {cartesFiltrees.length > 1 ? "s" : ""}
            </p>
          </div>

          {cartesFiltrees.length === 0 ? (
            <div className="rounded-2xl bg-slate-800 p-8 text-center">
              <p className="text-xl text-gray-300">
                Aucune carte ne correspond à ta recherche.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cartesFiltrees.map((carte) => {
                const historiqueCarte = historiquePrix
                  .filter(
                    (ligne) => ligne.carte_id === carte.identifiant
                  )
                  .map((ligne) => ({
                    prix: ligne.prix,
                    date: new Date(
                      ligne.date_releve
                    ).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                  }));

                return (
                  <PokemonCard
                    key={carte.identifiant}
                    nom={carte.nom}
                    edition={carte.edition}
                    type={carte.type}
                    etat={carte.etat}
                    prix={carte.prix}
                    image={carte.image}
                    historique={historiqueCarte}
                    selectionnee={cartesSelectionnees.includes(
                      carte.identifiant
                    )}
                    onSelectionner={() =>
                      selectionnerCarte(carte.identifiant)
                    }
                    onVoirGraphique={() =>
                      ouvrirGraphiqueCarte(carte.identifiant)
                    }
                    onModifier={() =>
                      modifierCarteDirectement(carte.identifiant)
                    }
                    onSupprimer={() =>
                      supprimerUneCarte(carte.identifiant)
                    }
                    favori={favoris.includes(carte.identifiant)}
                    onFavori={() =>
                      basculerFavori(carte.identifiant)
                    }
                    onAgrandir={() =>
                      setCarteAgrandie(carte)
                    }
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {modeCollection === "dresseurs" && (
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-amber-950/70 via-slate-950 to-yellow-950/30 p-4 shadow-2xl shadow-amber-950/30 sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="relative">
          <div className="mb-7 mt-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">
                Cartes de Dresseur
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
                🧑‍🏫 Mes Dresseurs
              </h2>
            </div>

            <p className="text-slate-400">
              {cartesDresseurs.length} carte
              {cartesDresseurs.length > 1 ? "s" : ""}
            </p>
          </div>

          {cartesDresseurs.length === 0 ? (
            <div className="rounded-2xl bg-slate-800 p-8 text-center">
              <p className="text-xl text-gray-300">
                Aucune carte Dresseur trouvée. Pour classer une carte ici, donne-lui le type « Dresseur ».
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cartesDresseurs.map((carte) => {
                const historiqueCarte = historiquePrix
                  .filter(
                    (ligne) => ligne.carte_id === carte.identifiant
                  )
                  .map((ligne) => ({
                    prix: ligne.prix,
                    date: new Date(
                      ligne.date_releve
                    ).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                  }));

                return (
                  <PokemonCard
                    key={carte.identifiant}
                    nom={carte.nom}
                    edition={carte.edition}
                    type={carte.type}
                    etat={carte.etat}
                    prix={carte.prix}
                    image={carte.image}
                    historique={historiqueCarte}
                    selectionnee={cartesSelectionnees.includes(
                      carte.identifiant
                    )}
                    onSelectionner={() =>
                      selectionnerCarte(carte.identifiant)
                    }
                    onVoirGraphique={() =>
                      ouvrirGraphiqueCarte(carte.identifiant)
                    }
                    onModifier={() =>
                      modifierCarteDirectement(carte.identifiant)
                    }
                    onSupprimer={() =>
                      supprimerUneCarte(carte.identifiant)
                    }
                    favori={favoris.includes(carte.identifiant)}
                    onFavori={() =>
                      basculerFavori(carte.identifiant)
                    }
                    onAgrandir={() =>
                      setCarteAgrandie(carte)
                    }
                  />
                );
              })}
            </div>
          )}
          </div>
        </section>
      )}

      {modeCollection === "energies" && (
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-slate-300/30 bg-gradient-to-br from-slate-700/60 via-slate-950 to-cyan-950/30 p-4 shadow-2xl shadow-slate-950/40 sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-200/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-8 left-8 text-8xl opacity-5">⚪</div>
          <div className="relative">
          <div className="mb-7 mt-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">
                Cartes Énergie
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
                ⚪ Mes Énergies
              </h2>
            </div>

            <p className="text-slate-400">
              {cartesEnergies.length} carte
              {cartesEnergies.length > 1 ? "s" : ""}
            </p>
          </div>

          {cartesEnergies.length === 0 ? (
            <div className="rounded-2xl bg-slate-800 p-8 text-center">
              <p className="text-xl text-gray-300">
                Aucune carte Énergie trouvée. Pour classer une carte ici, choisis le type « Énergie » dans le formulaire.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cartesEnergies.map((carte) => {
                const historiqueCarte = historiquePrix
                  .filter(
                    (ligne) => ligne.carte_id === carte.identifiant
                  )
                  .map((ligne) => ({
                    prix: ligne.prix,
                    date: new Date(
                      ligne.date_releve
                    ).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                  }));

                return (
                  <PokemonCard
                    key={carte.identifiant}
                    nom={carte.nom}
                    edition={carte.edition}
                    type={carte.type}
                    etat={carte.etat}
                    prix={carte.prix}
                    image={carte.image}
                    historique={historiqueCarte}
                    selectionnee={cartesSelectionnees.includes(
                      carte.identifiant
                    )}
                    onSelectionner={() =>
                      selectionnerCarte(carte.identifiant)
                    }
                    onVoirGraphique={() =>
                      ouvrirGraphiqueCarte(carte.identifiant)
                    }
                    onModifier={() =>
                      modifierCarteDirectement(carte.identifiant)
                    }
                    onSupprimer={() =>
                      supprimerUneCarte(carte.identifiant)
                    }
                    favori={favoris.includes(carte.identifiant)}
                    onFavori={() =>
                      basculerFavori(carte.identifiant)
                    }
                    onAgrandir={() =>
                      setCarteAgrandie(carte)
                    }
                  />
                );
              })}
            </div>
          )}
          </div>
        </section>
      )}

      {modeCollection === "pokemons" && (
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-blue-400/30 bg-gradient-to-br from-blue-950/80 via-slate-950 to-cyan-950/30 p-4 shadow-2xl shadow-blue-950/40 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute right-16 top-12 text-7xl opacity-10">⚡</div>
          <div className="relative">
          <div className="mb-7 mt-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">
                Cartes Pokémon
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
                ⚡ Mes Pokémon
              </h2>
            </div>

            <p className="text-slate-400">
              {cartesPokemon.length} carte
              {cartesPokemon.length > 1 ? "s" : ""}
            </p>
          </div>

          {cartesPokemon.length === 0 ? (
            <div className="rounded-2xl bg-slate-800 p-8 text-center">
              <p className="text-xl text-gray-300">
                Aucune carte Pokémon ne correspond à ta recherche.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cartesPokemon.map((carte) => {
                const historiqueCarte = historiquePrix
                  .filter(
                    (ligne) => ligne.carte_id === carte.identifiant
                  )
                  .map((ligne) => ({
                    prix: ligne.prix,
                    date: new Date(
                      ligne.date_releve
                    ).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                  }));

                return (
                  <PokemonCard
                    key={carte.identifiant}
                    nom={carte.nom}
                    edition={carte.edition}
                    type={carte.type}
                    etat={carte.etat}
                    prix={carte.prix}
                    image={carte.image}
                    historique={historiqueCarte}
                    selectionnee={cartesSelectionnees.includes(
                      carte.identifiant
                    )}
                    onSelectionner={() =>
                      selectionnerCarte(carte.identifiant)
                    }
                    onVoirGraphique={() =>
                      ouvrirGraphiqueCarte(carte.identifiant)
                    }
                    onModifier={() =>
                      modifierCarteDirectement(carte.identifiant)
                    }
                    onSupprimer={() =>
                      supprimerUneCarte(carte.identifiant)
                    }
                    favori={favoris.includes(carte.identifiant)}
                    onFavori={() =>
                      basculerFavori(carte.identifiant)
                    }
                    onAgrandir={() =>
                      setCarteAgrandie(carte)
                    }
                  />
                );
              })}
            </div>
          )}
          </div>
        </section>
      )}

      {modeCollection === "favoris" && (
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-black via-slate-950 to-yellow-950/30 p-4 shadow-2xl shadow-yellow-950/20 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="pointer-events-none absolute left-10 top-10 text-5xl opacity-10">⭐</div>
          <div className="relative">
          <div className="mb-7 mt-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-yellow-300">
                Tes cartes préférées
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
                ⭐ Favoris
              </h2>
            </div>

            <p className="text-slate-400">
              {cartesFiltrees.filter((carte) =>
                favoris.includes(carte.identifiant)
              ).length}{" "}
              carte
              {cartesFiltrees.filter((carte) =>
                favoris.includes(carte.identifiant)
              ).length > 1
                ? "s"
                : ""}
            </p>
          </div>

          {cartesFiltrees.filter((carte) =>
            favoris.includes(carte.identifiant)
          ).length === 0 ? (
            <div className="rounded-3xl border border-yellow-400/20 bg-slate-900/70 p-10 text-center">
              <p className="text-5xl">☆</p>

              <p className="mt-4 text-xl font-bold text-white">
                Aucun favori pour le moment
              </p>

              <p className="mt-2 text-slate-400">
                Clique sur l’étoile d’une carte pour l’ajouter ici.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cartesFiltrees
                .filter((carte) =>
                  favoris.includes(carte.identifiant)
                )
                .map((carte) => {
                  const historiqueCarte = historiquePrix
                    .filter(
                      (ligne) =>
                        ligne.carte_id === carte.identifiant
                    )
                    .map((ligne) => ({
                      prix: ligne.prix,
                      date: new Date(
                        ligne.date_releve
                      ).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                      }),
                    }));

                  return (
                    <PokemonCard
                      key={carte.identifiant}
                      nom={carte.nom}
                      edition={carte.edition}
                      type={carte.type}
                      etat={carte.etat}
                      prix={carte.prix}
                      image={carte.image}
                      historique={historiqueCarte}
                      selectionnee={cartesSelectionnees.includes(
                        carte.identifiant
                      )}
                      onSelectionner={() =>
                        selectionnerCarte(carte.identifiant)
                      }
                      onVoirGraphique={() =>
                        ouvrirGraphiqueCarte(carte.identifiant)
                      }
                      onModifier={() =>
                        modifierCarteDirectement(carte.identifiant)
                      }
                      onSupprimer={() =>
                        supprimerUneCarte(carte.identifiant)
                      }
                      favori
                      onFavori={() =>
                        basculerFavori(carte.identifiant)
                      }
                      onAgrandir={() =>
                        setCarteAgrandie(carte)
                      }
                    />
                  );
                })}
            </div>
          )}
          </div>
        </section>
      )}

      {modeCollection === "editions" && (
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-950/70 via-slate-950 to-indigo-950/30 p-4 shadow-2xl shadow-violet-950/30 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 right-10 text-8xl opacity-5">📖</div>
          <div className="relative">
          {cartesFiltrees.length === 0 ? (
            <div className="mt-10 rounded-2xl bg-slate-800 p-8 text-center">
              <p className="text-xl text-gray-300">
                Aucune carte ne correspond à ta recherche.
              </p>
            </div>
          ) : (
            <section className="mt-10 overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl sm:p-6">
              <div className="mb-6 flex flex-col gap-4 border-b border-slate-700 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-violet-300">
                    Classeur chronologique
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">
                    🗂️ Mes éditions
                  </h2>

                  <p className="mt-2 text-sm text-slate-400 sm:text-base">
                    Clique sur une édition pour afficher ou masquer ses cartes.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={ouvrirToutesLesEditions}
                    className="rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-3 text-sm font-bold text-blue-100 transition hover:border-blue-300/70 hover:bg-blue-500/25"
                  >
                    ▼ Tout ouvrir
                  </button>

                  <button
                    type="button"
                    onClick={fermerToutesLesEditions}
                    className="rounded-xl border border-slate-500/40 bg-slate-700/50 px-4 py-3 text-sm font-bold text-white transition hover:border-slate-300/70 hover:bg-slate-700"
                  >
                    ▲ Tout fermer
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {cartesParEdition.map(
                  ([nomEdition, cartesEdition], indexEdition) => {
                    const editionOuverte =
                      editionsOuvertes.includes(nomEdition);

                    const valeurEdition = cartesEdition.reduce(
                      (total, carte) =>
                        total + (Number(carte.prix) || 0),
                      0
                    );

                    const blocEdition =
                      informationsBlocEdition(nomEdition);

                    return (
                      <article
                        key={nomEdition}
                        className={`overflow-hidden rounded-2xl border bg-gradient-to-br transition duration-300 ${blocEdition.fond} ${
                          editionOuverte
                            ? `${blocEdition.bordure} shadow-xl`
                            : "border-slate-700/80 opacity-90 hover:opacity-100"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            basculerEdition(nomEdition)
                          }
                          className="flex w-full flex-col gap-4 p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:p-5"
                          aria-expanded={editionOuverte}
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <span
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl ${
                                editionOuverte
                                  ? "border-violet-300/50 bg-violet-500/20 text-violet-200"
                                  : "border-slate-600 bg-slate-900/60 text-slate-300"
                              }`}
                            >
                              {editionOuverte ? "▼" : "▶"}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/90 p-2 shadow-lg">
                                  <img
                                    src={blocEdition.logo}
                                    alt={`Logo ${blocEdition.nom}`}
                                    className="max-h-12 max-w-full object-contain"
                                    onError={(evenement) => {
                                      evenement.currentTarget.style.display =
                                        "none";
                                    }}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p
                                    className={`text-xs font-bold uppercase tracking-[0.18em] ${blocEdition.texte}`}
                                  >
                                    Édition n° {indexEdition + 1} •{" "}
                                    {blocEdition.nom}
                                  </p>

                                  <h3 className="mt-1 break-words text-xl font-black text-white sm:text-2xl">
                                    📚 {nomEdition}
                                  </h3>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
                            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-center">
                              <p className="text-xs uppercase tracking-wider text-blue-200">
                                Cartes
                              </p>

                              <p className="mt-1 text-lg font-black text-white">
                                {cartesEdition.length}
                              </p>
                            </div>

                            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-center">
                              <p className="text-xs uppercase tracking-wider text-yellow-200">
                                Valeur
                              </p>

                              <p className="mt-1 text-lg font-black text-yellow-300">
                                {valeurEdition.toLocaleString(
                                  "fr-FR",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}{" "}
                                €
                              </p>
                            </div>
                          </div>
                        </button>

                        {editionOuverte && (
                          <div className="border-t border-slate-700 p-4 sm:p-5">
                            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                              {[...cartesEdition]
                                .sort((a, b) => {
                                  const numeroTexteA = (a.numero || "").trim();
                                  const numeroTexteB = (b.numero || "").trim();

                                  const premierNombreA = Number(
                                    numeroTexteA.match(/\d+/)?.[0] ??
                                      Number.MAX_SAFE_INTEGER
                                  );

                                  const premierNombreB = Number(
                                    numeroTexteB.match(/\d+/)?.[0] ??
                                      Number.MAX_SAFE_INTEGER
                                  );

                                  if (premierNombreA !== premierNombreB) {
                                    return premierNombreA - premierNombreB;
                                  }

                                  return numeroTexteA.localeCompare(
                                    numeroTexteB,
                                    "fr",
                                    {
                                      numeric: true,
                                      sensitivity: "base",
                                    }
                                  );
                                })
                                .map((carte) => {
                                const historiqueCarte =
                                  historiquePrix
                                    .filter(
                                      (ligne) =>
                                        ligne.carte_id ===
                                        carte.identifiant
                                    )
                                    .map((ligne) => ({
                                      prix: ligne.prix,
                                      date: new Date(
                                        ligne.date_releve
                                      ).toLocaleDateString(
                                        "fr-FR",
                                        {
                                          day: "2-digit",
                                          month: "2-digit",
                                        }
                                      ),
                                    }));

                                return (
                                  <PokemonCard
                                    key={carte.identifiant}
                                    nom={carte.nom}
                                    edition={carte.edition}
                                    type={carte.type}
                                    etat={carte.etat}
                                    prix={carte.prix}
                                    image={carte.image}
                                    historique={historiqueCarte}
                                    selectionnee={cartesSelectionnees.includes(
                                      carte.identifiant
                                    )}
                                    onSelectionner={() =>
                                      selectionnerCarte(
                                        carte.identifiant
                                      )
                                    }
                                    onVoirGraphique={() =>
                                      ouvrirGraphiqueCarte(
                                        carte.identifiant
                                      )
                                    }
                                    onModifier={() =>
                                      modifierCarteDirectement(
                                        carte.identifiant
                                      )
                                    }
                                    onSupprimer={() =>
                                      supprimerUneCarte(
                                        carte.identifiant
                                      )
                                    }
                                    favori={favoris.includes(
                                      carte.identifiant
                                    )}
                                    onFavori={() =>
                                      basculerFavori(
                                        carte.identifiant
                                      )
                                    }
                                    onAgrandir={() =>
                                      setCarteAgrandie(carte)
                                    }
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            </section>
          )}
          </div>
        </section>
      )}

      {carteAgrandie && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setCarteAgrandie(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image agrandie de la carte"
        >
          <button
            type="button"
            onClick={() => setCarteAgrandie(null)}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-slate-900/80 text-2xl font-bold text-white transition hover:bg-slate-700 sm:right-8 sm:top-8"
            aria-label="Fermer l’image"
          >
            ✕
          </button>

          {carteAgrandie.image ? (
            <img
              src={carteAgrandie.image}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-[88vh] max-w-[96vw] rounded-xl object-contain shadow-2xl sm:max-h-[92vh] sm:max-w-[92vw] sm:rounded-2xl"
            />
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border border-slate-600 bg-slate-900 p-10 text-center text-slate-300"
            >
              Image indisponible
            </div>
          )}
        </div>
      )}
    </main>
  );
}