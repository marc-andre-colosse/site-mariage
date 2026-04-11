export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { name1, meal1, rest1, plusOne, name2, meal2, rest2 } = req.body;

  // Construction dynamique de l'objet pour Airtable
  const fields = {
    "Personne 1": name1,
    "Repas personne 1": meal1,
    "Restrictions personne 1": rest1 || ""
  };

  // On ajoute la personne 2 seulement si "Oui" est sélectionné
  if (plusOne === 'Oui') {
    fields["Personne 2"] = name2;
    fields["Repas personne 2"] = meal2;
    fields["Restrictions personne 2"] = rest2 || "";
  }

  try {
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || 'Erreur Airtable');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}