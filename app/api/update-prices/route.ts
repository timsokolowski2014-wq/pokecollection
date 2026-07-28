import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CarteSupabase = {
  id: number;
  nom: string;
  id_api: string | null;
  mise_a_jour_auto: boolean | null;
};

type PrixCardmarket = {
  updated?: string;
  trend?: number;
  avg?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
  "trend-holo"?: number;
  "avg-holo"?: number;
  "avg1-holo"?: number;
  "avg7-holo"?: number;
  "avg30-holo"?: number;
};

type CarteTCGdex = {
  pricing?: {
    cardmarket?: PrixCardmarket;
  };
};

function obtenirPrix(cardmarket?: PrixCardmarket) {
  if (!cardmarket) {
    return null;
  }

  return (
    cardmarket.trend ??
    cardmarket.avg ??
    cardmarket.avg7 ??
    cardmarket.avg30 ??
    cardmarket["trend-holo"] ??
    cardmarket["avg-holo"] ??
    cardmarket["avg7-holo"] ??
    cardmarket["avg30-holo"] ??
    null
  );
}

export async function GET(request: NextRequest) {
  const secretCron = process.env.CRON_SECRET;

  if (secretCron) {
    const autorisation = request.headers.get("authorization");

    if (autorisation !== `Bearer ${secretCron}`) {
      return NextResponse.json(
        { erreur: "Accès interdit." },
        { status: 401 }
      );
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json(
      {
        erreur:
          "Les variables SUPABASE_URL ou SUPABASE_SECRET_KEY sont absentes.",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase
    .from("cartes")
    .select("id, nom, id_api, mise_a_jour_auto")
    .eq("mise_a_jour_auto", true)
    .not("id_api", "is", null);

  if (error) {
    console.error("Erreur de lecture Supabase :", error);

    return NextResponse.json(
      { erreur: "Impossible de lire les cartes." },
      { status: 500 }
    );
  }

  const cartes = (data ?? []) as CarteSupabase[];

  let misesAJour = 0;
  let ignorees = 0;
  let echecs = 0;

  const details: string[] = [];

  for (const carte of cartes) {
    if (!carte.id_api) {
      ignorees++;
      continue;
    }

    try {
      const reponse = await fetch(
        `https://api.tcgdex.net/v2/fr/cards/${encodeURIComponent(
          carte.id_api
        )}`,
        {
          cache: "no-store",
        }
      );

      if (!reponse.ok) {
        echecs++;
        details.push(
          `${carte.nom} : carte introuvable dans TCGdex.`
        );
        continue;
      }

      const carteTCGdex = (await reponse.json()) as CarteTCGdex;
      const cardmarket = carteTCGdex.pricing?.cardmarket;
      const nouveauPrix = obtenirPrix(cardmarket);

      if (typeof nouveauPrix !== "number") {
        ignorees++;
        details.push(
          `${carte.nom} : aucun prix Cardmarket disponible.`
        );
        continue;
      }

      const dateMiseAJour =
        cardmarket?.updated ?? new Date().toISOString();

      const { error: erreurMiseAJour } = await supabase
        .from("cartes")
        .update({
          prix: nouveauPrix,
          prix_mis_a_jour: dateMiseAJour,
        })
        .eq("id", carte.id);

      if (erreurMiseAJour) {
  console.error(
    `Erreur pour ${carte.nom} :`,
    erreurMiseAJour
  );

  echecs++;
  details.push(
    `${carte.nom} : erreur pendant la mise à jour Supabase.`
  );
  continue;
}

const { error: erreurHistorique } = await supabase
  .from("historique_prix")
  .insert({
    carte_id: carte.id,
    prix: nouveauPrix,
    date_releve: dateMiseAJour,
  });

if (erreurHistorique) {
  console.error(
    `Erreur historique pour ${carte.nom} :`,
    erreurHistorique
  );

  echecs++;
  details.push(
    `${carte.nom} : prix mis à jour, mais historique non enregistré.`
  );
  continue;
}

misesAJour++;
    } catch (erreur) {
      console.error(`Erreur pour ${carte.nom} :`, erreur);

      echecs++;
      details.push(`${carte.nom} : erreur inattendue.`);
    }
  }

  return NextResponse.json({
    message: "Mise à jour terminée.",
    cartesAnalysees: cartes.length,
    misesAJour,
    ignorees,
    echecs,
    details,
  });
}