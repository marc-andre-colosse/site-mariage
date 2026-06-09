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
  const submissionId = "B-" + Date.now().toString().slice(-8);

  const records = guests.map(guest => ({
    fields: {
      "ID": submissionId,              
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
    
    // On trouve TOUS les invités du groupe qui ont fourni une adresse courriel
    const guestsWithEmail = guests.filter(g => g.email && g.email.trim() !== '');

    if (guestsWithEmail.length > 0) {
        // On utilise Promise.all pour envoyer tous les courriels en parallèle
        await Promise.all(guestsWithEmail.map(async (recipient) => {
            
            // On identifie les autres membres de son groupe (s'il y en a)
            const companions = guests.filter(g => g.name !== recipient.name);
            let companionsHtml = '';
            
            if (companions.length > 0) {
                const companionsList = companions.map(c => `<li style="margin-bottom: 5px;">${c.name}</li>`).join('');
                companionsHtml = `
                    <div style="background-color: rgba(82, 99, 66, 0.05); padding: 15px; border-radius: 5px; margin-bottom: 30px; text-align: left;">
                        <p style="font-size: 14px; font-weight: bold; margin-top: 0; color: #526342;">Personne(s) vous accompagnant :</p>
                        <ul style="font-size: 14px; margin-bottom: 0; padding-left: 20px;">
                            ${companionsList}
                        </ul>
                    </div>
                `;
            }

            try {
                await resend.emails.send({
                    from: 'Mariage Anne-Marie & Marc-André <info@mariage-amma.com>', 
                    to: recipient.email,
                    subject: 'Confirmation de votre présence - 12 Septembre 2026',
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #38462b; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid rgba(82, 99, 66, 0.4); border-radius: 5px; text-align: center;">
                            <h1 style="color: #526342; font-weight: normal; margin-bottom: 20px;">Merci ${recipient.name.split(' ')[0]} !</h1>
                            
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                Nous confirmons la bonne réception de votre RSVP pour notre mariage.<br>
                                Votre choix de repas (<strong>${recipient.meal}</strong>) a bien été noté.
                            </p>
                            
                            ${companionsHtml}
                            
                            <div style="width: 50px; height: 1px; background-color: #526342; margin: 0 auto 30px auto; opacity: 0.5;"></div>
                            
                            <p style="font-size: 14px; line-height: 1.6; opacity: 0.8; margin-bottom: 20px;">
                                Si vous souhaitez reconsulter les détails de l'événement ou les options d'hébergement, n'hésitez pas à visiter notre site web :<br>
                                <a href="https://mariage-amma.com" style="color: #526342; font-weight: bold; text-decoration: none;">Voir le site web du mariage</a>
                            </p>
                            
                            <p style="font-size: 14px; line-height: 1.6; font-style: italic; color: #526342;">
                                Pour toute question ou pour modifier votre réponse, vous pouvez nous écrire au <a href="mailto:info@mariage-amma.com" style="color: #526342;">info@mariage-amma.com</a>.<br><br>
                                Nous avons très hâte de célébrer avec vous !<br><br>
                                Anne-Marie & Marc-André
                            </p>
                        </div>
                    `
                });
            } catch (emailError) {
                // On log l'erreur pour cet invité spécifique, mais on continue la boucle pour les autres
                console.error(`Erreur lors de l'envoi du courriel à ${recipient.email}:`, emailError);
            }
        }));
    }

    // Tout a fonctionné (Airtable + les envois de courriels)
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({ error: "Erreur technique lors de l'envoi." });
  }
}