const getSpotifyToken = async () => {
    // --- TES INFORMATIONS À REMPLIR ---
    const clientId = '95e5ac1979184ad99eb4841b91f6f801';
    const clientSecret = '071a2924e1914a86a6e5ca05a7a9ce6d';
    const code = 'AQCl2fWHiJEebdOqnJvq_RVEWeuJO0hKGeAgPOKkrLNuUdk8_07h1_GZ9PLLAE0IAPkfSTBmUzIbBL5ieGlCpDY42pNW3ZveFLfNLjpZjp-EJRAvirI8YpbgGrJZDjrPPVQHlm7SSuOzAVEa77X51OysKPYSZatR3p3nWPFDc9aZY8_m3nNfvLp1a-_Tjdkm7DEQt0p5fxDwJWLkA02nioSIH5Y8wecFo2IOtc4'; 

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