"use server";

import { ocrServerService } from "@/server/services/ocrServer.service";

/**
 * Server action to parse receipt/invoice image using Gemini OCR.
 */
export async function parseReceiptAction(formData: FormData) {
  try {
    const file = (formData.get("image") || formData.get("file")) as File | null;
    if (!file) {
      throw new Error("No image file provided in form data");
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await ocrServerService.parseReceipt(arrayBuffer, file.type || "image/jpeg");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  } catch (error: any) {
    console.error("parseReceiptAction error:", error);
    throw new Error(error?.message || "Failed to parse receipt image");
  }
}
