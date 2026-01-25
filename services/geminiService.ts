
import { GoogleGenAI } from "@google/genai";

/**
 * Uses the Gemini 3 Flash model to generate a short, cyberpunk-style feedback for a post.
 */
export const analyzePostImpact = async (title: string, username: string): Promise<string> => {
  try {
    // Initializing GoogleGenAI with the API key from process.env as per strict guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `O usuário '${username}' acabou de reivindicar um setor com o título '${title}'.`,
      config: {
        systemInstruction: "Você é um juiz de uma rede social futurista chamada Crono Esfera. Dê um feedback curto (máximo 15 palavras), estilo cyberpunk, enaltecendo ou criticando a audácia dele.",
      },
    });
    
    // Using the .text property directly (not as a method) as per guidelines.
    return response.text?.trim() || "Seu registro foi detectado pela malha temporal.";
  } catch (error) {
    console.error("Erro na análise da IA:", error);
    return "Protocolo de análise interrompido. Legado registrado.";
  }
};
