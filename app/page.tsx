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
  quantite: number;
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
  const [quantite, setQuantite] = useState("1");
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
    "cartes" | "editions" | "favoris" | "dresseurs" | "energies" | "pokemons" | "doubles"
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

const nombreCartesTimothee = cartes
  .filter((carte) => carte.proprietaire === "Timothée")
  .reduce((total, carte) => total + (carte.quantite ?? 1), 0);

const nombreCartesValentin = cartes
  .filter((carte) => carte.proprietaire === "Valentin")
  .reduce((total, carte) => total + (carte.quantite ?? 1), 0);

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

  const quantiteCarte = carte.quantite ?? 1;
  statistiques[edition].nombre += quantiteCarte;
  statistiques[edition].valeur += prix * quantiteCarte;

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
        quantite: Math.max(1, Number(carte.quantite) || 1),
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
    const quantiteNumerique = Number(quantite);

    if (Number.isNaN(prixNumerique) || prixNumerique < 0) {
      alert("Le prix n'est pas valide.");
      return;
    }

    if (
      !Number.isInteger(quantiteNumerique) ||
      quantiteNumerique < 1
    ) {
      alert("La quantité doit être un nombre entier d'au moins 1.");
      return;
    }

    const nomNettoye = nom.trim().toLowerCase();
    const editionNettoyee = edition.trim().toLowerCase();
    const numeroNettoye = numero.trim().toLowerCase();
    const idApiNettoye = idApi.trim().toLowerCase();
    const etatNettoye = etat.trim().toLowerCase();

    const carteExistante = cartes.find((carte) => {
      if (carte.proprietaire !== proprietaireCarte) return false;
      if (carte.etat.trim().toLowerCase() !== etatNettoye) return false;

      const memeIdApi =
        idApiNettoye !== "" &&
        carte.idApi.trim().toLowerCase() === idApiNettoye;

      const memeCarteManuelle =
        carte.nom.trim().toLowerCase() === nomNettoye &&
        carte.edition.trim().toLowerCase() === editionNettoyee &&
        carte.numero.trim().toLowerCase() === numeroNettoye;

      return memeIdApi || memeCarteManuelle;
    });

    if (carteExistante) {
      const nouvelleQuantite =
        (carteExistante.quantite ?? 1) + quantiteNumerique;

      const { error } = await supabase
        .from("cartes")
        .update({ quantite: nouvelleQuantite })
        .eq("id", carteExistante.identifiant);

      if (error) {
        alert(error.message);
        return;
      }

      setCartes((anciennesCartes) =>
        anciennesCartes.map((carte) =>
          carte.identifiant === carteExistante.identifiant
            ? { ...carte, quantite: nouvelleQuantite }
            : carte
        )
      );

      setMessageNotification(
        `${carteExistante.nom} est maintenant en ×${nouvelleQuantite}.`
      );
      setNotificationVisible(true);
      setTimeout(() => setNotificationVisible(false), 3000);

      setNom("");
      setEdition("");
      setNumero("");
      setType("");
      setEtat("");
      setPrix("");
      setImage("");
      setIdApi("");
      setQuantite("1");
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
        quantite: quantiteNumerique,
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
        data.proprietaire === "Valentin" ? "Valentin" : "Timothée",
      quantite: Math.max(1, Number(data.quantite) || 1),
    };

    setCartes((anciennesCartes) => [...anciennesCartes, nouvelleCarte]);

    const { data: historiqueInitial, error: erreurHistoriqueInitial } =
      await supabase
        .from("historique_prix")
        .insert({
          carte_id: nouvelleCarte.identifiant,
          prix: nouvelleCarte.prix,
          date_releve: new Date().toISOString(),
        })
        .select()
        .single();

    if (erreurHistoriqueInitial) {
      console.error(
        "Impossible d'enregistrer le prix initial :",
        erreurHistoriqueInitial
      );
    } else if (historiqueInitial) {
      setHistoriquePrix((ancienHistorique) => [
        ...ancienHistorique,
        {
          id: historiqueInitial.id,
          carte_id: historiqueInitial.carte_id,
          prix: Number(historiqueInitial.prix) || 0,
          date_releve: historiqueInitial.date_releve,
        },
      ]);
    }

    setMessageNotification(
      `${nouvelleCarte.nom} a bien été ajoutée à ta collection.`
    );
    setNotificationVisible(true);
    setTimeout(() => setNotificationVisible(false), 3000);

    setNom("");
    setEdition("");
    setNumero("");
    setType("");
    setEtat("");
    setPrix("");
    setImage("");
    setIdApi("");
    setQuantite("1");
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

          const ancienPrix = Number(carte.prix) || 0;
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

          // L'historique doit représenter le moment où PokéCollection
          // constate réellement un changement de prix.
          // On n'utilise donc PAS la date "updated" de Cardmarket ici.
          if (Math.abs(nouveauPrix - ancienPrix) >= 0.005) {
            const {
              data: nouvelHistorique,
              error: erreurHistorique,
            } = await supabase
              .from("historique_prix")
              .insert({
                carte_id: carte.identifiant,
                prix: nouveauPrix,
                date_releve: new Date().toISOString(),
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

          const ancienPrix = Number(carte.prix) || 0;
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

          // On ajoute un point d'historique seulement quand le prix change.
          // Cela évite d'enregistrer plusieurs fois le même prix et permet
          // aux hausses, baisses et graphiques d'évoluer correctement.
          if (Math.abs(nouveauPrix - ancienPrix) >= 0.005) {
            const {
              data: nouvelHistorique,
              error: erreurHistoriqueAuto,
            } = await supabase
              .from("historique_prix")
              .insert({
                carte_id: carte.identifiant,
                prix: nouveauPrix,
                date_releve: new Date().toISOString(),
              })
              .select()
              .single();

            if (erreurHistoriqueAuto) {
              console.error(
                "Erreur historique automatique :",
                erreurHistoriqueAuto
              );
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
        quantite: Math.max(1, Math.floor(carteEnModification.quantite || 1)),
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

  type MetaEdition = {
    ordre: number;
    bloc: string;
  };

  // Ordre PokéCardex : de la plus vieille édition à la plus récente.
  // Le bloc est défini explicitement : on ne le devine plus avec l'année.
  const metaEditions: Record<string, MetaEdition> = {
    "promo black star wizards of the coast": { ordre: 1, bloc: "Wizards" },
    "set de base": { ordre: 2, bloc: "Wizards" },
    "jungle": { ordre: 3, bloc: "Wizards" },
    "fossile": { ordre: 4, bloc: "Wizards" },
    "base set 2": { ordre: 5, bloc: "Wizards" },
    "team rocket": { ordre: 6, bloc: "Wizards" },
    "gym heroes": { ordre: 7, bloc: "Wizards" },
    "gym challenge": { ordre: 8, bloc: "Wizards" },
    "neo genesis": { ordre: 9, bloc: "Wizards" },
    "neo discovery": { ordre: 10, bloc: "Wizards" },
    "neo revelation": { ordre: 11, bloc: "Wizards" },
    "neo destiny": { ordre: 12, bloc: "Wizards" },
    "legendary collection": { ordre: 13, bloc: "Wizards" },
    "expedition": { ordre: 14, bloc: "Wizards" },
    "aquapolis": { ordre: 15, bloc: "Wizards" },
    "skyridge": { ordre: 16, bloc: "Wizards" },
    "black star nintendo": { ordre: 17, bloc: "EX" },
    "ex rubis & saphir": { ordre: 18, bloc: "EX" },
    "ex rubis et saphir": { ordre: 19, bloc: "EX" },
    "ex tempete de sable": { ordre: 20, bloc: "EX" },
    "ex dragon": { ordre: 21, bloc: "EX" },
    "ex team magma vs team aqua": { ordre: 22, bloc: "EX" },
    "ex legendes oubliees": { ordre: 23, bloc: "EX" },
    "ex hidden legends": { ordre: 24, bloc: "EX" },
    "ex rouge feu & vert feuille": { ordre: 25, bloc: "EX" },
    "ex rouge feu et vert feuille": { ordre: 26, bloc: "EX" },
    "ex team rocket returns": { ordre: 27, bloc: "EX" },
    "ex deoxys": { ordre: 28, bloc: "EX" },
    "ex emeraude": { ordre: 29, bloc: "EX" },
    "ex forces cachees": { ordre: 30, bloc: "EX" },
    "ex especes delta": { ordre: 31, bloc: "EX" },
    "ex createurs de legendes": { ordre: 32, bloc: "EX" },
    "ex fantomes holon": { ordre: 33, bloc: "EX" },
    "ex gardiens de cristal": { ordre: 34, bloc: "EX" },
    "ex iles des dragons": { ordre: 35, bloc: "EX" },
    "ex ile des dragons": { ordre: 35, bloc: "EX" },
    "ex gardiens du pouvoir": { ordre: 36, bloc: "EX" },
    "promos black star dp": { ordre: 37, bloc: "Diamant et Perle" },
    "diamant & perle": { ordre: 38, bloc: "Diamant et Perle" },
    "diamant et perle": { ordre: 39, bloc: "Diamant et Perle" },
    "tresors mysterieux": { ordre: 40, bloc: "Diamant et Perle" },
    "merveilles secretes": { ordre: 41, bloc: "Diamant et Perle" },
    "rencontres au sommet": { ordre: 42, bloc: "Diamant et Perle" },
    "aube majestueuse": { ordre: 43, bloc: "Diamant et Perle" },
    "eveil des legendes": { ordre: 44, bloc: "Diamant et Perle" },
    "tempete": { ordre: 45, bloc: "Diamant et Perle" },
    "stormfront": { ordre: 46, bloc: "Diamant et Perle" },
    "platine": { ordre: 47, bloc: "Platine" },
    "rivaux emergents": { ordre: 48, bloc: "Platine" },
    "vainqueurs supremes": { ordre: 49, bloc: "Platine" },
    "arceus": { ordre: 50, bloc: "Platine" },
    "promos black star heartgold soulsilver": { ordre: 51, bloc: "HeartGold SoulSilver" },
    "heartgold soulsilver": { ordre: 52, bloc: "HeartGold SoulSilver" },
    "dechainement": { ordre: 53, bloc: "HeartGold SoulSilver" },
    "indomptable": { ordre: 54, bloc: "HeartGold SoulSilver" },
    "triomphe": { ordre: 55, bloc: "HeartGold SoulSilver" },
    "appel des legendes": { ordre: 56, bloc: "Appel des légendes" },
    "promos black star noir et blanc": { ordre: 57, bloc: "Noir et Blanc" },
    "promos black star black&white": { ordre: 58, bloc: "Noir et Blanc" },
    "noir & blanc": { ordre: 59, bloc: "Noir et Blanc" },
    "noir et blanc": { ordre: 60, bloc: "Noir et Blanc" },
    "pouvoirs emergents": { ordre: 61, bloc: "Noir et Blanc" },
    "nobles victoires": { ordre: 62, bloc: "Noir et Blanc" },
    "destinees futures": { ordre: 63, bloc: "Noir et Blanc" },
    "explorateurs obscurs": { ordre: 64, bloc: "Noir et Blanc" },
    "dragons exaltes": { ordre: 65, bloc: "Noir et Blanc" },
    "coffre des dragons": { ordre: 66, bloc: "Noir et Blanc" },
    "frontieres franchies": { ordre: 67, bloc: "Noir et Blanc" },
    "tempete plasma": { ordre: 68, bloc: "Noir et Blanc" },
    "glaciation plasma": { ordre: 69, bloc: "Noir et Blanc" },
    "explosion plasma": { ordre: 70, bloc: "Noir et Blanc" },
    "tresors legendaires": { ordre: 71, bloc: "Noir et Blanc" },
    "promotions xy": { ordre: 72, bloc: "XY" },
    "promo xy": { ordre: 73, bloc: "XY" },
    "promos x&y": { ordre: 74, bloc: "XY" },
    "kalos starter set": { ordre: 75, bloc: "XY" },
    "xy": { ordre: 76, bloc: "XY" },
    "etincelles": { ordre: 77, bloc: "XY" },
    "poings furieux": { ordre: 78, bloc: "XY" },
    "vigueur spectrale": { ordre: 79, bloc: "XY" },
    "primo-choc": { ordre: 80, bloc: "XY" },
    "primo choc": { ordre: 81, bloc: "XY" },
    "double danger": { ordre: 82, bloc: "XY" },
    "ciel rugissant": { ordre: 83, bloc: "XY" },
    "origines antiques": { ordre: 84, bloc: "XY" },
    "impulsion turbo": { ordre: 85, bloc: "XY" },
    "rupture turbo": { ordre: 86, bloc: "XY" },
    "generations": { ordre: 87, bloc: "XY" },
    "impact des destins": { ordre: 88, bloc: "XY" },
    "offensive vapeur": { ordre: 89, bloc: "XY" },
    "evolutions": { ordre: 90, bloc: "XY" },
    "promos soleil et lune": { ordre: 91, bloc: "Soleil et Lune" },
    "promos sun&moon": { ordre: 92, bloc: "Soleil et Lune" },
    "soleil et lune": { ordre: 93, bloc: "Soleil et Lune" },
    "gardiens ascendants": { ordre: 94, bloc: "Soleil et Lune" },
    "ombres ardentes": { ordre: 95, bloc: "Soleil et Lune" },
    "legendes brillantes": { ordre: 96, bloc: "Soleil et Lune" },
    "invasion carmin": { ordre: 97, bloc: "Soleil et Lune" },
    "ultra-prisme": { ordre: 98, bloc: "Soleil et Lune" },
    "ultra prisme": { ordre: 99, bloc: "Soleil et Lune" },
    "lumiere interdite": { ordre: 100, bloc: "Soleil et Lune" },
    "tempete celeste": { ordre: 101, bloc: "Soleil et Lune" },
    "majeste des dragons": { ordre: 102, bloc: "Soleil et Lune" },
    "tonnerre perdu": { ordre: 103, bloc: "Soleil et Lune" },
    "duo de choc": { ordre: 104, bloc: "Soleil et Lune" },
    "alliance infaillible": { ordre: 105, bloc: "Soleil et Lune" },
    "harmonie des esprits": { ordre: 106, bloc: "Soleil et Lune" },
    "destinees occultes": { ordre: 107, bloc: "Soleil et Lune" },
    "eclipse cosmique": { ordre: 108, bloc: "Soleil et Lune" },
    "promos epee et bouclier": { ordre: 109, bloc: "Épée et Bouclier" },
    "promos sword&shield": { ordre: 110, bloc: "Épée et Bouclier" },
    "epee et bouclier": { ordre: 111, bloc: "Épée et Bouclier" },
    "clash des rebelles": { ordre: 112, bloc: "Épée et Bouclier" },
    "tenebres embrasees": { ordre: 113, bloc: "Épée et Bouclier" },
    "la voie du maitre": { ordre: 114, bloc: "Épée et Bouclier" },
    "voltage eclatant": { ordre: 115, bloc: "Épée et Bouclier" },
    "destinees radieuses": { ordre: 116, bloc: "Épée et Bouclier" },
    "styles de combat": { ordre: 117, bloc: "Épée et Bouclier" },
    "regne de glace": { ordre: 118, bloc: "Épée et Bouclier" },
    "evolution celeste": { ordre: 119, bloc: "Épée et Bouclier" },
    "celebrations": { ordre: 120, bloc: "Épée et Bouclier" },
    "poing de fusion": { ordre: 121, bloc: "Épée et Bouclier" },
    "stars etincelantes": { ordre: 122, bloc: "Épée et Bouclier" },
    "astres radieux": { ordre: 123, bloc: "Épée et Bouclier" },
    "pokemon go": { ordre: 124, bloc: "Épée et Bouclier" },
    "origine perdue": { ordre: 125, bloc: "Épée et Bouclier" },
    "tempete argentee": { ordre: 126, bloc: "Épée et Bouclier" },
    "zenith supreme": { ordre: 127, bloc: "Épée et Bouclier" },
    "svp black star promos": { ordre: 128, bloc: "Écarlate et Violet" },
    "promotions svp black star": { ordre: 129, bloc: "Écarlate et Violet" },
    "promo svp black star": { ordre: 130, bloc: "Écarlate et Violet" },
    "promos ecarlate et violet": { ordre: 131, bloc: "Écarlate et Violet" },
    "energies ecarlate et violet": { ordre: 132, bloc: "Écarlate et Violet" },
    "ecarlate et violet": { ordre: 133, bloc: "Écarlate et Violet" },
    "evolutions a paldea": { ordre: 134, bloc: "Écarlate et Violet" },
    "flammes obsidiennes": { ordre: 135, bloc: "Écarlate et Violet" },
    "151": { ordre: 136, bloc: "Écarlate et Violet" },
    "faille paradoxe": { ordre: 137, bloc: "Écarlate et Violet" },
    "destinees de paldea": { ordre: 138, bloc: "Écarlate et Violet" },
    "forces temporelles": { ordre: 139, bloc: "Écarlate et Violet" },
    "mascarade crepusculaire": { ordre: 140, bloc: "Écarlate et Violet" },
    "fable nebuleuse": { ordre: 141, bloc: "Écarlate et Violet" },
    "couronne stellaire": { ordre: 142, bloc: "Écarlate et Violet" },
    "etincelles deferlantes": { ordre: 143, bloc: "Écarlate et Violet" },
    "evolutions prismatiques": { ordre: 144, bloc: "Écarlate et Violet" },
    "aventures ensemble": { ordre: 145, bloc: "Écarlate et Violet" },
    "rivalites destinees": { ordre: 146, bloc: "Écarlate et Violet" },
    "foudre noire": { ordre: 147, bloc: "Écarlate et Violet" },
    "flamme blanche": { ordre: 148, bloc: "Écarlate et Violet" },
    "promos mega-evolution": { ordre: 149, bloc: "Méga-Évolution" },
    "promos mega evolution": { ordre: 150, bloc: "Méga-Évolution" },
    "energies mega-evolution": { ordre: 151, bloc: "Méga-Évolution" },
    "energies mega evolution": { ordre: 152, bloc: "Méga-Évolution" },
    "mega-evolution": { ordre: 153, bloc: "Méga-Évolution" },
    "mega evolution": { ordre: 154, bloc: "Méga-Évolution" },
    "flammes fantasmagoriques": { ordre: 155, bloc: "Méga-Évolution" },
    "heros transcendants": { ordre: 156, bloc: "Méga-Évolution" },
    "equilibre parfait": { ordre: 157, bloc: "Méga-Évolution" },
    "chaos ascendant": { ordre: 158, bloc: "Méga-Évolution" },
    "nuit noire": { ordre: 159, bloc: "Méga-Évolution" },
  };

  const stylesBlocs: Record<
    string,
    {
      nom: string;
      logo: string;
      fond: string;
      bordure: string;
      texte: string;
    }
  > = {
    Wizards: {
      nom: "Wizards",
      logo: "",
      fond: "from-yellow-950/40 via-blue-950/25 to-slate-900",
      bordure: "border-yellow-300/35",
      texte: "text-yellow-100",
    },
    EX: {
      nom: "EX",
      logo: "",
      fond: "from-orange-950/45 via-red-950/20 to-slate-900",
      bordure: "border-orange-400/35",
      texte: "text-orange-200",
    },
    "Diamant et Perle": {
      nom: "Diamant et Perle",
      logo: "",
      fond: "from-cyan-950/45 via-violet-950/25 to-slate-900",
      bordure: "border-cyan-300/35",
      texte: "text-cyan-100",
    },
    Platine: {
      nom: "Platine",
      logo: "",
      fond: "from-slate-700/50 via-violet-950/20 to-slate-900",
      bordure: "border-slate-300/35",
      texte: "text-slate-200",
    },
    "HeartGold SoulSilver": {
      nom: "HeartGold SoulSilver",
      logo: "",
      fond: "from-amber-950/40 via-slate-950 to-slate-900",
      bordure: "border-amber-300/35",
      texte: "text-amber-100",
    },
    "Appel des légendes": {
      nom: "Appel des légendes",
      logo: "",
      fond: "from-slate-800 via-yellow-950/20 to-slate-900",
      bordure: "border-yellow-200/30",
      texte: "text-yellow-100",
    },
    "Noir et Blanc": {
      nom: "Noir et Blanc",
      logo: "",
      fond: "from-slate-700/55 via-slate-950 to-slate-900",
      bordure: "border-slate-300/35",
      texte: "text-slate-200",
    },
    XY: {
      nom: "XY",
      logo: "",
      fond: "from-blue-950/50 via-red-950/25 to-slate-900",
      bordure: "border-cyan-400/35",
      texte: "text-cyan-200",
    },
    "Soleil et Lune": {
      nom: "Soleil et Lune",
      logo: "",
      fond: "from-yellow-950/45 via-purple-950/30 to-slate-900",
      bordure: "border-yellow-400/35",
      texte: "text-yellow-200",
    },
    "Épée et Bouclier": {
      nom: "Épée et Bouclier",
      logo: "",
      fond: "from-blue-950/55 via-pink-950/25 to-slate-900",
      bordure: "border-blue-400/35",
      texte: "text-blue-200",
    },
    "Écarlate et Violet": {
      nom: "Écarlate et Violet",
      logo: "",
      fond: "from-red-950/55 via-violet-950/35 to-slate-900",
      bordure: "border-violet-400/35",
      texte: "text-violet-200",
    },
    "Méga-Évolution": {
      nom: "Méga-Évolution",
      logo: "",
      fond: "from-fuchsia-950/45 via-cyan-950/25 to-slate-900",
      bordure: "border-fuchsia-400/35",
      texte: "text-fuchsia-200",
    },
  };

  function trouverMetaEdition(nomEdition: string): MetaEdition | null {
    const nomNormalise = normaliserNomEdition(nomEdition);

    if (metaEditions[nomNormalise]) {
      return metaEditions[nomNormalise];
    }

    // Tolère des noms un peu plus longs provenant d'une API.
    const correspondance = Object.entries(metaEditions)
      .filter(([nomConnu]) =>
        nomNormalise === nomConnu ||
        nomNormalise.includes(nomConnu) ||
        nomConnu.includes(nomNormalise)
      )
      .sort((a, b) => b[0].length - a[0].length)[0];

    return correspondance?.[1] ?? null;
  }

  function rangChronologiqueEdition(nomEdition: string) {
    const nomNormalise = normaliserNomEdition(nomEdition);
    const meta = trouverMetaEdition(nomEdition);

    if (meta) {
      return meta.ordre;
    }

    // Sécurité : toute édition qui commence par "EX" reste dans le bloc EX
    // même si son nom exact n'est pas encore dans la table.
    if (nomNormalise.startsWith("ex ")) {
      const ordresEX = Object.values(metaEditions)
        .filter((edition) => edition.bloc === "EX")
        .map((edition) => edition.ordre);

      return Math.max(...ordresEX) + 0.5;
    }

    return 999999;
  }

  function informationsBlocEdition(nomEdition: string) {
    const nomNormalise = normaliserNomEdition(nomEdition);
    const meta = trouverMetaEdition(nomEdition);

    if (meta && stylesBlocs[meta.bloc]) {
      return stylesBlocs[meta.bloc];
    }

    // Sécurités pour les noms non encore connus.
    if (nomNormalise.startsWith("ex ")) {
      return stylesBlocs.EX;
    }

    if (
      nomNormalise.startsWith("svp") ||
      nomNormalise.includes("ecarlate") ||
      nomNormalise.includes("paldea")
    ) {
      return stylesBlocs["Écarlate et Violet"];
    }

    return {
      nom: "Autres",
      logo: "",
      fond: "from-slate-800 via-slate-900 to-slate-950",
      bordure: "border-slate-500/35",
      texte: "text-slate-200",
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

const nombreExemplairesCollection = cartesCollection.reduce(
  (total, carte) => total + (carte.quantite ?? 1),
  0
);

const nombreDresseurs = cartesCollection
  .filter((carte) => {
  const typeNormalise = normaliserTypeCarte(carte.type);

  return (
    typeNormalise.startsWith("dresseur") ||
    typesDresseur.includes(typeNormalise)
  );
})
  .reduce((total, carte) => total + (carte.quantite ?? 1), 0);

const nombreEnergies = cartesCollection
  .filter((carte) => {
  const typeNormalise = normaliserTypeCarte(carte.type);

  return (
    typeNormalise.startsWith("energie") ||
    typesEnergie.includes(typeNormalise)
  );
})
  .reduce((total, carte) => total + (carte.quantite ?? 1), 0);

const nombrePokemon =
  nombreExemplairesCollection - nombreDresseurs - nombreEnergies;

const cartesEnDoubleOuPlus = cartesCollection.filter(
  (carte) => (carte.quantite ?? 1) > 1
);

const nombreExemplairesEnDoubleOuPlus = cartesEnDoubleOuPlus.reduce(
  (total, carte) => total + (carte.quantite ?? 1),
  0
);

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
    const rangA = rangChronologiqueEdition(editionA);
    const rangB = rangChronologiqueEdition(editionB);

    // De la plus vieille édition à la plus récente.
    if (rangA !== rangB) {
      return rangA - rangB;
    }

    return editionA.localeCompare(editionB, "fr", {
      numeric: true,
      sensitivity: "base",
    });
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
  const quantiteCarte = carte.quantite ?? 1;

  return total + (Number.isNaN(prixCarte) ? 0 : prixCarte * quantiteCarte);
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

  const quantiteCarte = carte.quantite ?? 1;
  statistiques[typeCarte].nombre += quantiteCarte;
  statistiques[typeCarte].valeur += prixCarte * quantiteCarte;

  return statistiques;
}, {});


  const debutAujourdhui = new Date();
  debutAujourdhui.setHours(0, 0, 0, 0);

  const dernierPrixAvantAujourdhui = new Map<number, number>();

  historiquePrix
    .filter(
      (ligne) =>
        new Date(ligne.date_releve).getTime() < debutAujourdhui.getTime()
    )
    .sort(
      (a, b) =>
        new Date(a.date_releve).getTime() -
        new Date(b.date_releve).getTime()
    )
    .forEach((ligne) => {
      dernierPrixAvantAujourdhui.set(ligne.carte_id, ligne.prix);
    });

  const valeurReferenceAujourdhui = cartesCollection.reduce(
    (total, carte) => {
      const prixReference =
        dernierPrixAvantAujourdhui.get(carte.identifiant) ?? carte.prix;

      return total + prixReference * (carte.quantite ?? 1);
    },
    0
  );

  const evolutionAujourdhui =
    valeurCollection - valeurReferenceAujourdhui;

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
        variation: (prixActuel - prixPrecedent) * (carte.quantite ?? 1),
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
    totalCartes={nombreExemplairesCollection}
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
        quantite={quantite}
        setQuantite={setQuantite}
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
          {nombreExemplairesCollection}
        </p>

        <p className="mt-2 text-sm text-slate-400">
          {nombreExemplairesCollection > 1
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
          {(nombreExemplairesCollection > 0
            ? valeurCollection / nombreExemplairesCollection
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
          Depuis le dernier relevé avant aujourd’hui
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
            nombreExemplairesCollection > 0
              ? (statistiques.nombre / nombreExemplairesCollection) * 100
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
            nombreExemplairesCollection > 0
              ? (statistiques.nombre / nombreExemplairesCollection) * 100
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

            <label className="font-semibold">
              Quantité
              <input
                type="number"
                min="1"
                step="1"
                value={carteEnModification.quantite}
                onChange={(e) =>
                  setCarteEnModification({
                    ...carteEnModification,
                    quantite: Math.max(1, Number(e.target.value) || 1),
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

          <button
            type="button"
            onClick={() => setModeCollection("doubles")}
            className={`min-w-44 flex-1 rounded-xl px-3 py-3 text-sm font-bold transition sm:text-base ${
              modeCollection === "doubles"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40"
                : "text-slate-300 hover:bg-slate-800 hover:text-amber-300"
            }`}
          >
            🃏 Cartes en doubles
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
              {cartesFiltrees.reduce(
                (total, carte) => total + (carte.quantite ?? 1),
                0
              )} carte
              {cartesFiltrees.reduce(
                (total, carte) => total + (carte.quantite ?? 1),
                0
              ) > 1
                ? "s"
                : ""}
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
                    quantite={carte.quantite}
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
                    quantite={carte.quantite}
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
                    quantite={carte.quantite}
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

      {modeCollection === "doubles" && (
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-950/70 via-slate-950 to-orange-950/30 p-4 shadow-2xl shadow-amber-950/30 sm:p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-300">
                Exemplaires multiples
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                🃏 Cartes en doubles, triples et plus
              </h2>
            </div>

            <p className="text-sm font-semibold text-slate-400">
              {cartesEnDoubleOuPlus.length} carte
              {cartesEnDoubleOuPlus.length > 1 ? "s" : ""} différente
              {cartesEnDoubleOuPlus.length > 1 ? "s" : ""} ·{" "}
              {nombreExemplairesEnDoubleOuPlus} exemplaires
            </p>
          </div>

          {cartesEnDoubleOuPlus.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-8 text-center text-slate-400">
              Tu n’as aucune carte en double pour le moment.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {cartesEnDoubleOuPlus.map((carte) => {
                const historiqueCarte = historiquePrix.filter(
                  (ligne) => ligne.carte_id === carte.identifiant
                );

                return (
                  <PokemonCard
                    key={carte.identifiant}
                    nom={carte.nom}
                    edition={carte.edition}
                    type={carte.type}
                    etat={carte.etat}
                    prix={carte.prix}
                    quantite={carte.quantite}
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
                    onAgrandir={() => setCarteAgrandie(carte)}
                  />
                );
              })}
            </div>
          )}
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
                    quantite={carte.quantite}
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
                      quantite={carte.quantite}
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

                    const blocPrecedent =
                      indexEdition > 0
                        ? informationsBlocEdition(
                            cartesParEdition[indexEdition - 1][0]
                          ).nom
                        : null;

                    const nouveauBloc =
                      blocPrecedent !== blocEdition.nom;

                    return (
                      <div
                        key={nomEdition}
                        className="space-y-4"
                      >
                        {nouveauBloc && (
                          <div className="mt-8 rounded-2xl border border-slate-600/70 bg-slate-950/70 px-5 py-4 shadow-xl">
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                              Bloc
                            </p>

                            <h3 className={`mt-1 text-2xl font-black sm:text-3xl ${blocEdition.texte}`}>
                              {blocEdition.nom}
                            </h3>
                          </div>
                        )}

                        <article
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
                                    quantite={carte.quantite}
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
                      </div>
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