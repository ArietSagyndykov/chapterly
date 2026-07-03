import { z } from "zod";
import {
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  ACCEPTED_PDF_TYPES,
  ACCEPTED_IMAGE_TYPES,
} from "@/lib/constants";

const pdfFileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_FILE_SIZE, "PDF must be under 50MB")
  .refine((f) => ACCEPTED_PDF_TYPES.includes(f.type), "File must be a PDF");

const coverImageSchema = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_IMAGE_SIZE, "Image must be under 10MB")
  .refine((f) => ACCEPTED_IMAGE_TYPES.includes(f.type), "Image must be JPEG, PNG, or WebP")
  .optional();

export const UploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  author: z
    .string()
    .min(1, "Author name is required")
    .max(200, "Author name is too long"),
  voice: z.string().min(1, "Please select a voice"),
  pdfFile: pdfFileSchema,
  coverImage: coverImageSchema,
});
