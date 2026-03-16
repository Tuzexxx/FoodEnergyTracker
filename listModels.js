const apiKey = process.env.GEMINI_API_KEY;

fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey)
    .then(r => r.json())
    .then(d => {
        const flashModels = d.models; // Show all models
        console.log("Available Flash Models:");
        flashModels.forEach(m => console.log(m.name, m.supportedGenerationMethods));
    })
    .catch(console.error);
