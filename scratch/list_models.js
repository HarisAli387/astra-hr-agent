import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ 
  apiKey: "AIzaSyBCG6256SVF4z4XzWcz7g_xzCIeu-itdqg" 
});

async function listModels() {
  try {
    const models = await ai.models.list();
    console.log(JSON.stringify(models, null, 2));
  } catch (e) {
    console.error(e);
  }
}

listModels();
