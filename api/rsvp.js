export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { guests, groupName } = req.body;

  if (!guests || !Array.isArray(guests)) {
    return res.status(400).json({ error: "Format de données invalide" });
  }

  const records = guests.map(guest => ({
    fields: {
      "Nom complet": guest.name,
      "Repas": guest.meal,
      "Restrictions": guest.restrictions || "",
      "Chanson": guest.song || "", // <--- Ajout du mapping vers ta nouvelle colonne
      "Groupe": groupName
    }
  }));

  try {
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Airtable détaillée:', data);
      return res.status(response.status).json({ error: data.error.message || "Erreur Airtable" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur Serveur:', error);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
}