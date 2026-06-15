const getSpotifyToken = async () => {
    // --- TES INFORMATIONS À REMPLIR ---
    const clientId = '95e5ac1979184ad99eb4841b91f6f801';
    const clientSecret = '071a2924e1914a86a6e5ca05a7a9ce6d';
    const code = 'AQAK9kPWcgu8Cr9cOjEVfHrSck22yWPpU4YA8Ae_tHvm7T479krsl3KdzgLt53Rd1lKlPbsh6kIU8A3slkq8eN0m5aE0sQizA5jEYeOhqT1u42iTnWx4rqqNLoIq058pTZe0Lb1sLZpFzcTCLcMUdU85BJ8CyB_2f9HaWsCkQzq6qbb8WKFza6GKtToYgCWxdzMiyUGqXZrTS-28WHZd0jqRpKiP3xSBB58Ubtw'; 

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: 'https://mariage-amma.com' // Ton domaine sécurisé
            })
        });

        const data = await response.json();
        
        console.log('\n🎉 SUCCÈS ! VOICI TON REFRESH TOKEN :');
        console.log('--------------------------------------------------');
        console.log(data.refresh_token);
        console.log('--------------------------------------------------\n');
        
    } catch (erreur) {
        console.error('Oups, petite erreur :', erreur);
    }
};

getSpotifyToken();