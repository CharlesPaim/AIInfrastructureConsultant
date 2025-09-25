import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const startChat = async (prompt: string): Promise<{ chat: Chat; firstResponse: string; }> => {
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
        });

        const response: GenerateContentResponse = await chat.sendMessage({ message: prompt });
        return { chat, firstResponse: response.text };

    } catch (error) {
        console.error("Error starting chat with Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Ocorreu um erro ao iniciar o chat com a IA: ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao iniciar o chat com a IA.");
    }
};
