type PokemonCardProps = {
  nom: string;
  edition: string;
  etat: string;
  prix: number;
  image: string;
};

export default function PokemonCard({
  nom,
  edition,
  etat,
  prix,
  image,
}: PokemonCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-lg hover:scale-105 transition">
      <div className="bg-gray-700 h-64 rounded-lg flex items-center justify-center text-6xl">
        📷
      </div>

    {image && (
      <img
        src={image}
        className="w-full h-64 object-contain rounded-xl mb-4"
      />
    )}

      <h2 className="text-2xl font-bold mt-4">{nom}</h2>

      <p>📚 {edition}</p>

      <p>⭐ {etat}</p>

      <p className="text-green-400 font-bold text-xl">
        💰 {prix} €
      </p>
    </div>
  );
}