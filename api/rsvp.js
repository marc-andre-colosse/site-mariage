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
    
    if (!response.ok) {
        console.error('❌ Erreur de Jeton (Token) Spotify :', data);
        return null;
    }
    
    return data.access_token;
}

async function addSongToPlaylist(songName, accessToken) {
    if (!songName || songName.trim() === '') return;

    try {
        // === LE TEST ULTIME DE L'IDENTITÉ ===
        const meRes = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const meData = await meRes.json();
        console.log(`\n========================================`);
        console.log(`👤 IDENTITÉ SPOTIFY CONNECTÉE : ${meData.id}`);
        console.log(`👉 PROPRIÉTAIRE DE LA PLAYLIST REQUIS : monteboy63`);
        console.log(`========================================\n`);
        // =====================================

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
    // ENVOI DU COURRIEL DE CONFIRMATION AUX INVITÉS
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

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({ error: "Erreur technique lors de l'envoi." });
  }
}