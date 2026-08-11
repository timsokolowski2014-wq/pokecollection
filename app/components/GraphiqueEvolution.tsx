"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Carte = {
  identifiant: number;
  nom: string;
  edition: string;
  prix: number;
  quantite?: number;
};

type HistoriquePrix = {
  carte_id: number;
  prix: number;
  date_releve: string;
};

type Periode = 7 | 30 | 365;
type Mode = "collection" | "edition" | "carte";

type Props = {
  mode: Mode;
  cartes: Carte[];
  historiquePrix: HistoriquePrix[];
  carteId?: number | null;
  edition?: string;
  onFermer: () => void;
};

type Point = {
  date: string;
  dateComplete: string;
  valeur: number;
};

function debutJour(date: Date) {
  const copie = new Date(date);
  copie.setHours(0, 0, 0, 0);
  return copie;
}

function obtenirDates(periode: Periode) {
  const aujourdHui = debutJour(new Date());
  const dates: Date[] = [];
  const pas = periode === 365 ? 7 : 1;

  for (let jours = periode - 1; jours >= 0; jours -= pas) {
    const date = new Date(aujourdHui);
    date.setDate(date.getDate() - jours);
    dates.push(date);
  }

  if (
    dates.length === 0 ||
    dates[dates.length - 1].toDateString() !== aujourdHui.toDateString()
  ) {
    dates.push(aujourdHui);
  }

  return dates;
}

function prixCarteALaDate(
  carte: Carte,
  date: Date,
  historiquePrix: HistoriquePrix[]
) {
  const finJour = new Date(date);
  finJour.setHours(23, 59, 59, 999);

  const lignes = historiquePrix
    .filter(
      (ligne) =>
        ligne.carte_id === carte.identifiant &&
        new Date(ligne.date_releve).getTime() <= finJour.getTime()
    )
    .sort(
      (a, b) =>
        new Date(a.date_releve).getTime() -
        new Date(b.date_releve).getTime()
    );

  return lignes.length > 0
    ? (Number(lignes[lignes.length - 1].prix) || 0) * (carte.quantite ?? 1)
    : (Number(carte.prix) || 0) * (carte.quantite ?? 1);
}

function creerPoints(
  cartes: Carte[],
  historiquePrix: HistoriquePrix[],
  periode: Periode
): Point[] {
  const dates = obtenirDates(periode);
  const aujourdHui = debutJour(new Date());

  return dates.map((date) => {
    const estAujourdhui =
      debutJour(date).getTime() === aujourdHui.getTime();

    const valeur = estAujourdhui
      ? cartes.reduce(
          (total, carte) => total + (Number(carte.prix) || 0) * (carte.quantite ?? 1),
          0
        )
      : cartes.reduce(
          (total, carte) =>
            total + prixCarteALaDate(carte, date, historiquePrix),
          0
        );

    return {
      date: date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      dateComplete: date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      valeur: Number(valeur.toFixed(2)),
    };
  });
}

export default function GraphiqueEvolution({
  mode,
  cartes,
  historiquePrix,
  carteId,
  edition = "",
  onFermer,
}: Props) {
  const [periode, setPeriode] = useState<Periode>(30);

  const cartesDuGraphique = useMemo(() => {
    if (mode === "collection") return cartes;

    if (mode === "edition") {
      return cartes.filter((carte) => carte.edition === edition);
    }

    return cartes.filter((carte) => carte.identifiant === carteId);
  }, [mode, cartes, carteId, edition]);

  const titre =
    mode === "collection"
      ? "Évolution de la collection"
      : mode === "edition"
        ? `Évolution de l’édition ${edition}`
        : `Évolution du prix de ${cartesDuGraphique[0]?.nom ?? "la carte"}`;

  const nombreExemplairesGraphique = cartesDuGraphique.reduce(
    (total, carte) => total + (carte.quantite ?? 1),
    0
  );

  const donnees = useMemo(
    () => creerPoints(cartesDuGraphique, historiquePrix, periode),
    [cartesDuGraphique, historiquePrix, periode]
  );

  const premiereValeur = donnees[0]?.valeur ?? 0;
  const derniereValeur = donnees[donnees.length - 1]?.valeur ?? 0;
  const variation = derniereValeur - premiereValeur;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-blue-400/20 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-300">
              Analyse des prix
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              📈 {titre}
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {nombreExemplairesGraphique} carte
              {nombreExemplairesGraphique > 1 ? "s" : ""} dans ce graphique
            </p>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="self-start rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 font-bold text-white transition hover:border-slate-400 hover:bg-slate-700"
          >
            ✕ Fermer
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <p className="text-sm text-slate-400">Valeur actuelle</p>
            <p className="mt-2 text-2xl font-black text-yellow-300">
              {derniereValeur.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <p className="text-sm text-slate-400">Début de période</p>
            <p className="mt-2 text-2xl font-black text-white">
              {premiereValeur.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <p className="text-sm text-slate-400">Variation</p>
            <p
              className={`mt-2 text-2xl font-black ${
                variation > 0
                  ? "text-green-400"
                  : variation < 0
                    ? "text-red-400"
                    : "text-slate-300"
              }`}
            >
              {variation > 0 ? "+" : ""}
              {variation.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { valeur: 7 as Periode, texte: "1 semaine" },
            { valeur: 30 as Periode, texte: "1 mois" },
            { valeur: 365 as Periode, texte: "1 an" },
          ].map((bouton) => (
            <button
              key={bouton.valeur}
              type="button"
              onClick={() => setPeriode(bouton.valeur)}
              className={`rounded-xl px-5 py-3 font-bold transition ${
                periode === bouton.valeur
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                  : "border border-slate-600 bg-slate-800 text-slate-300 hover:border-blue-400 hover:text-white"
              }`}
            >
              {bouton.texte}
            </button>
          ))}
        </div>

        {cartesDuGraphique.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-slate-700 bg-slate-800/70 p-10 text-center text-slate-400">
            Aucune carte disponible pour ce graphique.
          </div>
        ) : (
          <div className="mt-7 h-80 w-full rounded-2xl border border-slate-700 bg-slate-950/60 p-3 sm:h-96 sm:p-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={donnees}
                margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="rgba(148, 163, 184, 0.18)"
                />

                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  minTickGap={24}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  stroke="#94a3b8"
                  width={75}
                  domain={["auto", "auto"]}
                  tickFormatter={(valeur) => `${Number(valeur).toFixed(2)} €`}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(96, 165, 250, 0.35)",
                    borderRadius: "16px",
                    color: "white",
                  }}
                  labelStyle={{ color: "#bfdbfe", fontWeight: 700 }}
                  formatter={(valeur) => [
                    `${Number(valeur).toFixed(2)} €`,
                    "Valeur",
                  ]}
                  labelFormatter={(_, elements) =>
                    elements?.[0]?.payload?.dateComplete ?? ""
                  }
                />

                <Line
                  type="monotone"
                  dataKey="valeur"
                  name="Valeur"
                  stroke="#60a5fa"
                  strokeWidth={4}
                  dot={
                    periode === 365
                      ? false
                      : {
                          r: 3,
                          fill: "#facc15",
                          stroke: "#0f172a",
                          strokeWidth: 2,
                        }
                  }
                  activeDot={{
                    r: 7,
                    fill: "#facc15",
                    stroke: "#2563eb",
                    strokeWidth: 3,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}