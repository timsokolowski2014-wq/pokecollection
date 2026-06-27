type FormulaireProps = {
  nom: string;
  setNom: (value: string) => void;

  edition: string;
  setEdition: (value: string) => void;

  etat: string;
  setEtat: (value: string) => void;

  prix: string;
  setPrix: (value: string) => void;

  image: string;
  setImage: (value: string) => void;

  onEnregistrer: () => void;
};

export default function Formulaire({
  nom,
  setNom,
  edition,
  setEdition,
  etat,
  setEtat,
  prix,
  setPrix,
  image,
  setImage,
  onEnregistrer,
}: FormulaireProps) {


  function choisirImage(e: React.ChangeEvent<HTMLInputElement>) {

    const fichier = e.target.files?.[0];

    if (!fichier) return;

    const lecteur = new FileReader();

    lecteur.onload = () => {
      setImage(lecteur.result as string);
    };

    lecteur.readAsDataURL(fichier);
  }


  return (
    <div className="max-w-2xl mx-auto bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-700">


      <h2 className="text-4xl font-bold mb-2">
        ➕ Ajouter une carte
      </h2>


      <p className="text-gray-400 mb-8">
        Remplis les informations de ta carte Pokémon.
      </p>



      <div className="space-y-6">


        {/* PHOTO */}

        <div>

          <label className="block mb-2 font-semibold">
            📸 Photo de la carte
          </label>


          <input
            type="file"
            accept="image/*"
            onChange={choisirImage}
            className="w-full rounded-xl bg-slate-700 p-4 text-white"
          />


          {image && (

            <img
              src={image}
              className="mt-4 w-48 rounded-xl shadow-lg mx-auto"
            />

          )}

        </div>



        <div>
          <label className="block mb-2 font-semibold">
            📛 Nom de la carte
          </label>


          <input
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Ex : Dracaufeu EX"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />

        </div>



        <div>
          <label className="block mb-2 font-semibold">
            📚 Édition
          </label>


          <select
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            value={edition}
            onChange={(e) => setEdition(e.target.value)}
          >

            <option value="">
              Choisir une édition
            </option>

            <option>Évolutions</option>
            <option>151</option>
            <option>Destinées de Paldea</option>
            <option>Couronne Stellaire</option>
            <option>Étincelles Déferlantes</option>

          </select>

        </div>



        <div>
          <label className="block mb-2 font-semibold">
            ⭐ État
          </label>


          <select
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            value={etat}
            onChange={(e) => setEtat(e.target.value)}
          >

            <option value="">
              Choisir un état
            </option>

            <option>Mint</option>
            <option>Near Mint</option>
            <option>Excellent</option>
            <option>Good</option>
            <option>Played</option>
            <option>Poor</option>

          </select>

        </div>



        <div>
          <label className="block mb-2 font-semibold">
            💰 Prix (€)
          </label>


          <input
            type="number"
            className="w-full rounded-xl bg-slate-700 p-4 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="0"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
          />

        </div>



        <button
          onClick={onEnregistrer}
          className="w-full mt-6 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg rounded-xl p-4 transition"
        >
          💾 Ajouter à la collection
        </button>


      </div>


    </div>
  );
}