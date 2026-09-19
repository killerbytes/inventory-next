import { GoogleGenAI } from "@google/genai";
import "server-only";
import { productCombinationServerService } from "./productCombinationServer.service";

export interface OCRArticleItem {
  quantity: number;
  unit: string;
  article: string;
  price: number;
  suggestedProducts?: any[];
}

export interface OCRReceiptResult {
  receiptNo: string;
  articles: OCRArticleItem[];
}

export const ocrServerService = {
  async parseReceipt(
    buffer: Buffer | ArrayBuffer,
    mimeType: string = "image/jpeg",
  ): Promise<OCRReceiptResult> {
    const prompt = `Parse the attached receipt/sales order image and extract the information strictly as a JSON object with the following structure:
{
  "receiptNo": "string",
  "articles": [
    {
      "quantity": number,
      "unit": "string",
      "article": "string",
      "price": number
    }
  ]
}
Return ONLY valid JSON. Do not include markdown formatting or backticks.`;

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    let parsedData: OCRReceiptResult = {
      receiptNo: `REC-${Date.now()}`,
      articles: [],
    };

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const base64Data = Buffer.isBuffer(buffer)
          ? buffer.toString("base64")
          : Buffer.from(buffer).toString("base64");

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });

        const jsonText = response.text || "";
        try {
          parsedData = JSON.parse(jsonText);
        } catch {
          const cleanText = jsonText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          parsedData = JSON.parse(cleanText);
        }
      } catch (error: any) {
        console.error("OCR GenAI parse error:", error);
        if (error?.status === 429 || error?.message?.includes("429")) {
          throw new Error(
            "Gemini API rate limit exceeded. Please wait a few seconds before trying again.",
          );
        }
        throw new Error(
          `Failed to parse receipt image: ${error?.message || error}`,
        );
      }
    } else {
      // Fallback for local environments without Gemini API key configured
      parsedData = {
        receiptNo: `REC-${Date.now()}`,
        articles: [
          {
            quantity: 1,
            unit: "PCS",
            article: "Sample Scanned Item",
            price: 100,
          },
        ],
      };
    }

    if (parsedData.articles && Array.isArray(parsedData.articles)) {
      for (const item of parsedData.articles) {
        item.suggestedProducts = await ocrServerService.getSuggestions(item);
      }
    }

    return parsedData;
  },

  async getSuggestions(item: {
    article?: string;
    unit?: string;
    price?: number;
  }) {
    if (!item.article) return [];
    return await productCombinationServerService.searchSuggestion(
      item.article,
      item.unit,
      item.price,
    );
  },
};
