const getSpotifyToken = async () => {
    // --- TES INFORMATIONS À REMPLIR ---
    const clientId = '95e5ac1979184ad99eb4841b91f6f801';
    const clientSecret = '071a2924e1914a86a6e5ca05a7a9ce6d';
    const code = 'AQCsmZRmHGhVZdMLUbXnQ2ah8GdcjSVW819eemcU6sJV4frDeW4XOPQgwMTbJ4CYtYsBMYZgp-kNlpsITS8fA8wROccrthymTV4OgJuYKgiisgZ-FYTKPWpG4mWqhlPa4EHWPlB-maik62bKjIcOlOmnurNAHHDM7mvXyg_8n3H48A5K8S8HfHl9eQ2yADQ9HZi0HuaI7LgUXHGcNlA9kDnYIBqC9aNjEeqWVKc'; 

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