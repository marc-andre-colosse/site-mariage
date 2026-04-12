export default async function handler(req, res) {
  // On accepte uniquement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { guests, groupName } = req.body;

  // Sécurité : Vérifier que les données reçues sont bien un tableau
  if (!guests || !Array.isArray(guests)) {
    return res.status(400).json({ error: "Format de données invalide : 'guests' doit être un tableau." });
  }

  // Transformation des données pour le format multi-records d'Airtable
  const records = guests.map(guest => ({
    fields: {
      "Personne": guest.name,       // Correspond à ta colonne 'Nom complet'
      "Repas": guest.meal,             // Recevra "Repas 1" ou "Repas 2"
      "Restrictions": guest.restrictions || "",
      "Chanson": guest.song || "",     // Correspond à ta nouvelle colonne 'Chanson'
      "Groupe": groupName              // Le nom de l'Invité #1 pour lier tout le monde
    }
  }));

  try {
    // Appel à l'API Airtable
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records })
    });

    const airtableData = await response.json();

    // Si Airtable retourne une erreur (ex: mauvais nom de colonne ou de choix de repas)
    if (!response.ok) {
      console.error('Erreur Airtable détaillée:', airtableData);
      return res.status(response.status).json({ 
        error: airtableData.error.message || "Erreur lors de l'enregistrement dans Airtable" 
      });
    }

    // Tout s'est bien passé
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Erreur serveur interne:', error);
    return res.status(500).json({ error: "Erreur technique lors de l'envoi." });
  }
}