import { Resend } from 'resend';

// Initialisation de Resend avec ta clé API (définie dans Vercel)
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { guests, groupName } = req.body;

  if (!guests || !Array.isArray(guests)) {
    return res.status(400).json({ error: "Format de données invalide." });
  }

  // --- GÉNÉRATION DE L'ID DE BUNDLE ---
  // On prend les 8 derniers chiffres du timestamp actuel (unique à la milliseconde)
  // On ajoute une lettre "B" pour "Bundle" au début pour le style.
  const submissionId = "B-" + Date.now().toString().slice(-8);

  const records = guests.map(guest => ({
    fields: {
      "ID": submissionId,              // <--- L'ID unique pour tout le groupe
      "Personne": guest.name,
      "Repas": guest.meal,
      "Restrictions": guest.restrictions || "",
      "Chanson": guest.song || "",
      "Courriel": guest.email || "",
      "Téléphone": guest.phone || "",
      "Groupe": groupName
    }
  }));

  try {
    // ==========================================
    // 1. ENVOI DES DONNÉES VERS AIRTABLE
    // ==========================================
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records })
    });

    const airtableData = await response.json();

    if (!response.ok) {
      console.error('Erreur Airtable:', airtableData);
      return res.status(response.status).json({ 
        error: airtableData.error.message || "Erreur lors de l'enregistrement" 
      });
    }

    // ==========================================
    // 2. ENVOI DU COURRIEL DE CONFIRMATION (RESEND)
    // ==========================================
    // On cherche le premier invité du groupe qui a fourni une adresse courriel
    const mainGuest = guests.find(g => g.email && g.email.trim() !== '');

    if (mainGuest) {
        try {
            await resend.emails.send({
                // ⚠️ IMPORTANT: Remplace "info@ton-domaine-verifie.com" par ton adresse d'envoi vérifiée sur Resend
                from: 'Mariage Anne-Marie & Marc-André <info@ton-domaine-verifie.com>', 
                to: mainGuest.email,
                subject: 'Confirmation de votre présence - 12 Septembre 2026',
                html: `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #38462b; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #526342; border-radius: 5px; text-align: center;">
                        <h1 style="color: #526342; font-weight: normal; margin-bottom: 20px;">Merci ${mainGuest.name.split(' ')[0]} !</h1>
                        
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                            Nous confirmons la bonne réception de votre RSVP pour notre mariage.<br>
                            Vos choix de repas et informations ont bien été notés.
                        </p>
                        
                        <div style="width: 50px; height: 1px; background-color: #526342; margin: 0 auto 30px auto; opacity: 0.5;"></div>
                        
                        <p style="font-size: 14px; font-style: italic; opacity: 0.8;">
                            Nous avons très hâte de célébrer avec vous le 12 septembre 2026 !<br><br>
                            Anne-Marie & Marc-André
                        </p>
                    </div>
                `
            });
        } catch (emailError) {
            // Si l'envoi du courriel échoue (ex: mauvaise adresse), on log l'erreur 
            // mais on ne bloque pas la réussite de l'inscription dans Airtable.
            console.error('Erreur lors de l\'envoi du courriel Resend:', emailError);
        }
    }

    // Tout a fonctionné !
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({ error: "Erreur technique lors de l'envoi." });
  }
}