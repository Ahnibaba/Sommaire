import { GoogleGenAI } from "@google/genai"
import { SUMMARY_SYSTEM_PROMPT } from "../../utils/prompt"

export const generateSummaryFromGemini = async (pdfText: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" })

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        temperature: 0.7,
        maxOutputTokens: 3000,
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: SUMMARY_SYSTEM_PROMPT },
            {
              text: `Transform this document into an engaging, easy-to-read summary 
              with contextually relevant emojis and proper markdown formatting:\n\n${pdfText}`,
            },
          ],
        },
      ],
    })

    console.dir(result, { depth: null });

    // Extract text safely
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text

    return text
  } catch (error) {
    console.error("Gemini API Error:", error)
    throw error
  }
}
