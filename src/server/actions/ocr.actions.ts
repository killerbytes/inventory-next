"use server";

import { PERMISSIONS } from "@/lib/rbac";
import { ocrServerService } from "@/server/services/ocrServer.service";
import { createProtectedAction } from "./safeAction";

/**
 * Server action to parse receipt/invoice image using Gemini OCR.
 */
export const parseReceiptAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_GOODS,
  handler: async (_ctx, formData: FormData) => {
    const file = (formData.get("image") || formData.get("file")) as File | null;
    if (!file) {
      throw new Error("No image file provided in form data");
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await ocrServerService.parseReceipt(
      arrayBuffer,
      file.type || "image/jpeg",
    );
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});
