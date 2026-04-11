export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send();

  const { guests, groupName } = req.body; // "guests" sera un tableau d'objets

  // On prépare le format attendu par Airtable : { records: [ { fields: {...} }, ... ] }
  const records = guests.map(guest => ({
    fields: {
      "Nom complet": guest.name,
      "Repas": guest.meal,
      "Restrictions": guest.restrictions || "",
      "Groupe": groupName // Le nom du premier invité sert de lien pour les regrouper
    }
  }));

  try {
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records }) // On envoie le tableau de records
    });

    if (!response.ok) throw new Error('Erreur Airtable');

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}