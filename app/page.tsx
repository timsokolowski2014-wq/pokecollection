"use client";

import { useState } from "react";
import PokemonCard from "./components/PokemonCard";
import Formulaire from "./components/Formulaire";

export default function Home() {
  const [cartes, setCartes] = useState([
    {
      nom: "Dracaufeu",
      edition: "Évolutions",
      etat: "Near Mint",
      prix: 320,
      image: "",
    },
  ]);

  const [nom, setNom] = useState("");
  const [edition, setEdition] = useState("");
  const [etat, setEtat] = useState("");
  const [prix, setPrix] = useState("");
  const [image, setImage] = useState("");

  function ajouterCarte() {
    if (!nom || !edition || !etat || !prix) {
      alert("Remplis tous les champs !");
      return;
    }

    setCartes([
      ...cartes,
      {
        nom,
        edition,
        etat,
        prix: Number(prix),
        image,
      },
    ]);

    setNom("");
    setEdition("");
    setEtat("");
    setPrix("");
    setImage("");
  }

  const valeurCollection = cartes.reduce(
    (total, carte) => total + carte.prix,
    0
  );

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">

      <h1 className="text-5xl font-bold text-center mb-8">
        🃏 PokéCollection
      </h1>

      <div className="flex justify-center gap-10 text-xl mb-10">
        <p>📊 Total : {cartes.length} cartes</p>
        <p>💰 Valeur : {valeurCollection} €</p>
      </div>

      <Formulaire
        nom={nom}
        setNom={setNom}
        edition={edition}
        setEdition={setEdition}
        etat={etat}
        setEtat={setEtat}
        prix={prix}
        setPrix={setPrix}
        image={image}
        setImage={setImage}
        onEnregistrer={ajouterCarte}
      />

      <h2 className="text-3xl font-bold mt-10 mb-6">
        📚 Mes cartes
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cartes.map((carte, index) => (
          <PokemonCard
            key={index}
            nom={carte.nom}
            edition={carte.edition}
            etat={carte.etat}
            prix={carte.prix}
            image={carte.image}
          />
        ))}
      </div>

    </main>
  );
}