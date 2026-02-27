import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    .then(res => res.json())
    .then((data: any) => {
        if (data && data.models) {
            console.log("Available models:");
            data.models.forEach((m: any) => console.log(`- ${m.name}`));
        } else {
            console.log("Error or no models:", data);
        }
    })
    .catch(console.error);
