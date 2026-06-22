import { z } from "zod";
import {
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  ACCEPTED_PDF_TYPES,
  ACCEPTED_IMAGE_TYPES,
} from "@/lib/constants";

export const UploadSchema = z.object({
  pdfFile: z
    .instanceof(File)
    .refine((f) => ACCEPTED_PDF_TYPES.includes(f.type), "Must be a PDF file")
    .refine((f) => f.size <= MAX_FILE_SIZE, "File must be under 50MB"),
  coverImage: z
    .instanceof(File)
    .optional()
    .refine(
      (f) => !f || ACCEPTED_IMAGE_TYPES.includes(f.type),
      "Must be a JPEG, PNG, or WebP image"
    )
    .refine(
      (f) => !f || f.size <= MAX_IMAGE_SIZE,
      "Cover image must be under 10MB"
    ),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  author: z
    .string()
    .min(1, "Author name is required")
    .max(200, "Author name is too long"),
  voice: z.string().min(1, "Please select a voice"),
});
