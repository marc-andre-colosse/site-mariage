const getSpotifyToken = async () => {
    // --- TES INFORMATIONS À REMPLIR ---
    const clientId = '95e5ac1979184ad99eb4841b91f6f801';
    const clientSecret = '071a2924e1914a86a6e5ca05a7a9ce6d';
    const code = 'AQCiIwnu9gFQ6nzne4hnE-E6VNcUBoGIIrgMAHx1CBa2W2mlU0UltQWQRS-HPmgHPIAzIw9gJ2j8oYYj-qrVf2rsflXtUkwp1Pt2eGcH9gNIKqPPQ5TuLHi0IgEWQMavW9rzBXOEezdR-F_8hjrhtNzIPHJFbxTgizmgTYu_HuaG4b412WqqZgsA-qvc9mN_PKF_LFnK4XYuM0HLa1yqLHmd7TYtYFydYqnha_E'; 

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