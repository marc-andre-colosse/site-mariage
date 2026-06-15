import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// FONCTIONS SPOTIFY
// ==========================================
async function getSpotifyAccessToken() {
    const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: process.env.SPOTIFY_REFRESH_TOKEN
        })
    });
    const data = await response.json();
    
    // LA NOUVELLE LUMIÈRE : Si Spotify refuse le Refresh Token, on l'affiche !
    if (!response.ok) {
        console.error('❌ Erreur de Jeton (Token) Spotify :', data);
        return null;
    }
    
    return data.access_token;
}

async function addSongToPlaylist(songName, accessToken) {
    if (!songName || songName.trim() === '') return;

    try {
        // 1. Chercher la chanson sur Spotify
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}&type=track&limit=1`;
        const searchRes = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const searchData = await searchRes.json();
        
        // 2. Si on trouve une chanson, on l'ajoute à la playlist
        if (searchData.tracks && searchData.tracks.items.length > 0) {
            const trackUri = searchData.tracks.items[0].uri;
            const playlistUrl = `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/tracks`;
            
            const addRes = await fetch(playlistUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uris: [trackUri] })
            });

            // ICI : Le nouveau log pour savoir si ça marche pour de vrai
            if (addRes.ok) {
                console.log(`🎵 SUCCÈS RÉEL : "${songName}" a été ajoutée à ta playlist !`);
            } else {
                const errorData = await addRes.json();
                console.error(`❌ ÉCHEC DE L'AJOUT (Code ${addRes.status}) :`, JSON.stringify(errorData));
            }

        } else {
            console.log(`⚠️ Introuvable sur Spotify : "${songName}"`);
        }
    } catch (err) {
        console.error(`Erreur système lors de l'ajout de "${songName}":`, err);
    }
}

// ==========================================
// HANDLER PRINCIPAL DU FORMULAIRE RSVP
// ==========================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { guests, groupName } = req.body;

  if (!guests || !Array.isArray(guests)) {
    return res.status(400).json({ error: "Format de données invalide." });
  }

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
    // 1. ENVOI DES DONNÉES VERS AIRTABLE
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
      return res.status(response.status).json({ error: airtableData.error.message || "Erreur lors de l'enregistrement" });
    }

    // ==========================================
    // ENVOI DES CHANSONS VERS SPOTIFY
    // ==========================================
    try {
        const spotifyToken = await getSpotifyAccessToken();
        if (spotifyToken) {
            for (const guest of guests) {
                if (guest.song && guest.song.trim() !== '') {
                    await addSongToPlaylist(guest.song, spotifyToken);
                }
            }
        }
    } catch (spotifyError) {
        console.error('Erreur d\'authentification globale Spotify:', spotifyError);
    }

    // ==========================================
    // 2. ENVOI DU COURRIEL DE CONFIRMATION AUX INVITÉS
    // ==========================================
    const guestsWithEmail = guests.filter(g => g.email && g.email.trim() !== '');

    if (guestsWithEmail.length > 0) {
        await Promise.all(guestsWithEmail.map(async (recipient) => {
            const companions = guests.filter(g => g.name !== recipient.name);
            let companionsHtml = '';
            
            if (companions.length > 0) {
                const companionsList = companions.map(c => `<li style="margin-bottom: 5px;">${c.name}</li>`).join('');
                companionsHtml = `
                    <div class="companion-box" style="background-color: rgba(82, 99, 66, 0.08); padding: 15px; border-radius: 5px; margin-bottom: 30px; text-align: left;">
                        <p class="accent-text" style="font-size: 14px; font-weight: bold; margin-top: 0; color: #526342;">Personne(s) vous accompagnant :</p>
                        <ul class="main-text" style="font-size: 14px; margin-bottom: 0; padding-left: 20px; color: #38462b;">
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
                        <!DOCTYPE html>
                        <html lang="fr">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="color-scheme" content="light">
                            <meta name="supported-color-schemes" content="light">
                            <style>
                                :root { color-scheme: light; supported-color-schemes: light; }
                                body, .content-box { background-color: #f6f5ef !important; color: #38462b !important; }
                                .main-text { color: #38462b !important; }
                                .accent-text { color: #526342 !important; }
                                
                                @media (prefers-color-scheme: dark) {
                                    body { background-color: #f6f5ef !important; }
                                    .content-box { background-color: #f6f5ef !important; border-color: #526342 !important; }
                                    .main-text { color: #38462b !important; }
                                    .accent-text { color: #526342 !important; }
                                    .divider { background-color: #526342 !important; opacity: 0.5 !important; }
                                    .companion-box { background-color: rgba(82, 99, 66, 0.08) !important; }
                                }
                            </style>
                        </head>
                        <body style="margin: 0; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f6f5ef;">
                            <div class="content-box" style="background-color: #f6f5ef; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #526342; border-radius: 5px; text-align: center;">
                                <h1 class="accent-text" style="color: #526342; font-weight: normal; margin-bottom: 20px;">Merci ${recipient.name.split(' ')[0]} !</h1>
                                
                                <p class="main-text" style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #38462b;">
                                    Nous confirmons la bonne réception de votre RSVP pour notre mariage.<br>
                                    Votre choix de repas (<strong class="accent-text" style="color: #526342;">${recipient.meal}</strong>) a bien été noté.
                                </p>
                                
                                ${companionsHtml}

                                <div style="margin: 30px 0;">
                                    <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Mariage+d%27Anne-Marie+%26+Marc-Andr%C3%A9&dates=20260912T193000Z%2F20260913T040000Z&details=Nous+avons+tr%C3%A8s+h%C3%A2te+de+c%C3%A9l%C3%A9brer+avec+vous+%21+Informations+et+h%C3%A9bergements+sur+%3A+https%3A%2F%2Fmariage-amma.com&location=1685+Chenal-du-Moine%2C+Sainte-Anne-de-Sorel&sf=true&output=xml" target="_blank" style="background-color: #526342; color: #f6f5ef; padding: 13px 28px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block; letter-spacing: 1px; font-size: 13px; text-transform: uppercase; font-family: sans-serif;">
                                        📅 Ajouter à mon agenda
                                    </a>
                                </div>
                                
                                <div class="divider" style="width: 50px; height: 1px; background-color: #526342; margin: 0 auto 30px auto; opacity: 0.5;"></div>
                                
                                <p class="main-text" style="font-size: 14px; line-height: 1.6; opacity: 0.8; margin-bottom: 20px; color: #38462b;">
                                    Si vous souhaitez reconsulter les détails de l'événement ou les options d'hébergement, n'hésitez pas à visiter notre site web :<br>
                                    <a href="https://mariage-amma.com" class="accent-text" style="color: #526342; font-weight: bold; text-decoration: none;">Voir le site web du mariage</a>
                                </p>
                                
                                <p class="accent-text" style="font-size: 14px; line-height: 1.6; font-style: italic; color: #526342;">
                                    Pour toute question ou pour modifier votre réponse, vous pouvez nous écrire au <a href="mailto:info@mariage-amma.com" class="accent-text" style="color: #526342;">info@mariage-amma.com</a>.<br><br>
                                    Nous avons très hâte de célébrer avec vous !<br><br>
                                    Anne-Marie & Marc-André
                                </p>
                            </div>
                        </body>
                        </html>
                    `
                });
            } catch (emailError) {
                console.error(`Erreur lors de l'envoi du courriel à ${recipient.email}:`, emailError);
            }
        }));
    }

    // ==========================================
    // 3. ENVOI DE LA NOTIFICATION ADMIN (À VOUS)
    // ==========================================
    try {
        let adminHtml = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="color-scheme" content="light">
                <meta name="supported-color-schemes" content="light">
                <style>
                    :root { color-scheme: light; supported-color-schemes: light; }
                    body, .content-box { background-color: #f6f5ef !important; color: #38462b !important; }
                    .accent-text { color: #526342 !important; }
                    
                    @media (prefers-color-scheme: dark) {
                        body, .content-box { background-color: #f6f5ef !important; color: #38462b !important; }
                        .accent-text { color: #526342 !important; }
                        .guest-card { background-color: rgba(82, 99, 66, 0.05) !important; border: 1px solid rgba(82, 99, 66, 0.15) !important; }
                    }
                </style>
            </head>
            <body style="margin: 0; padding: 20px; font-family: sans-serif; background-color: #f6f5ef;">
                <div class="content-box" style="color: #38462b; max-width: 600px; margin: 0 auto; background-color: #f6f5ef; padding: 30px; border: 1px solid #526342; border-radius: 5px;">
                    <h2 class="accent-text" style="color: #526342; font-weight: normal; margin-top: 0;">💒 Nouveau RSVP reçu !</h2>
                    <p><strong>Groupe principal :</strong> ${groupName}</p>
                    <p><strong>ID de soumission :</strong> ${submissionId}</p>
                    <hr style="border: none; border-top: 1px solid rgba(82, 99, 66, 0.3); margin: 20px 0;">
        `;

        guests.forEach((guest, index) => {
            adminHtml += `
                <div class="guest-card" style="background-color: rgba(82, 99, 66, 0.05); padding: 15px; border-radius: 5px; margin-bottom: 15px; border: 1px solid rgba(82, 99, 66, 0.15);">
                    <h3 class="accent-text" style="margin-top: 0; color: #526342; font-weight: normal;">Invité #${index + 1} : ${guest.name}</h3>
                    <ul style="line-height: 1.6; margin-bottom: 0; color: #38462b; padding-left: 20px;">
                        <li><strong>Courriel :</strong> ${guest.email || '<em>Non spécifié</em>'}</li>
                        <li><strong>Cellulaire :</strong> ${guest.phone || '<em>Non spécifié</em>'}</li>
                        <li><strong>Repas :</strong> ${guest.meal}</li>
                        <li><strong>Allergies / Restrictions :</strong> ${guest.restrictions || '<em>Aucune</em>'}</li>
                        <li><strong>Chanson :</strong> ${guest.song || '<em>Aucune</em>'}</li>
                    </ul>
                </div>
            `;
        });

        adminHtml += `
                </div>
            </body>
            </html>
        `;

        await resend.emails.send({
            from: 'Système RSVP <info@mariage-amma.com>', 
            to: 'info@mariage-amma.com', 
            subject: `🎉 Nouveau RSVP : ${groupName} (${guests.length} personne(s))`,
            html: adminHtml
        });
    } catch (adminEmailError) {
        console.error(`Erreur lors de l'envoi de la notification admin:`, adminEmailError);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({ error: "Erreur technique lors de l'envoi." });
  }
}