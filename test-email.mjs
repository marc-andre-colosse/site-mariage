import { Resend } from 'resend';
import fs from 'fs';

// Remplace la valeur ci-dessous par ta vraie clé API Resend (qui commence par re_...)
// Laisse bien les guillemets simples autour de la clé !
const resend = new Resend('re_b9ZQ9sxz_94qHsFd5q6WL87CcYNj2LfLn');

async function sendTestEmail() {
    try {
        // 1. On lit ton beau fichier HTML
        const htmlContent = fs.readFileSync('./courriel_rappel.html', 'utf8');

        // 2. Vos adresses de test
        const testEmails = ['monte63@live.ca', 'am_simard@hotmail.com'];

        console.log("🚀 Lancement du test d'envoi...");

        // 3. On envoie la boucle
        for (const email of testEmails) {
            const { data, error } = await resend.emails.send({
                from: 'Mariage Anne-Marie & Marc-André <info@mariage-amma.com>', 
                to: email,
                subject: 'J-5 avant le grand jour (test) ! 💍',
                html: htmlContent
            });
            
            if (error) {
                console.error(`❌ Erreur pour ${email} :`, error);
            } else {
                console.log(`✅ Succès pour ${email} ! ID: ${data.id}`);
            }
        }
        
        console.log("🎉 Test terminé ! Allez vérifier vos courriels.");
        
    } catch (err) {
        console.error("❌ Erreur technique globale :", err);
    }
}

sendTestEmail();