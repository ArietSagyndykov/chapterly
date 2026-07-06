"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, ImageIcon, X, Loader2 } from "lucide-react";
import { UploadSchema } from "@/lib/zod";
import { voiceOptions, voiceCategories, DEFAULT_VOICE } from "@/lib/constants";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { checkBookExists, createBook, deleteBookBlobs, saveBookSegments } from "@/lib/actions/book.actions";
import { useRouter } from "next/navigation";
import { parsePDFFile } from "@/lib/utils";
import { upload } from "@vercel/blob/client";

type BookUploadFormValues = z.infer<typeof UploadSchema>;

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<BookUploadFormValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: {
      title: "",
      author: "",
      voice: DEFAULT_VOICE,
      pdfFile: undefined,
      coverImage: undefined,

    },
  });

  const onSubmit = async (data: BookUploadFormValues) => {

    if (!userId) {
      return toast.error("Please login to upload books");
    }
    setIsSubmitting(true);
    //PostHog -> Track back Uploads
    try {
      const existsCheck = await checkBookExists(data.title);
      if (existsCheck.exists && existsCheck.book) {
        toast.info("Book with same name already exists");
        form.reset();
        router.push(`/books/${existsCheck.book.slug}`);
        return;

      }
      const fileTitle = data.title.replace(/\s+/g, '-').toLowerCase();
      const pdfFile = data.pdfFile;
      const parsedPDF = await parsePDFFile(pdfFile);

      if (parsedPDF.content.length === 0) {
        toast.error("Failed to parse PDF. Please try again later");
        return;
      }
      const uploadedPdfBlob = await upload(fileTitle, pdfFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: "application/pdf"
      });
      let coverUrl: string;
      if (data.coverImage) {
        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, data.coverImage, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "image/jpeg"
        });
        coverUrl = uploadedCoverBlob.url;
      }
      else {
        const response = await fetch(parsedPDF.cover);
        const blob = await response.blob();
        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "image/jpeg"
        });
        coverUrl = uploadedCoverBlob.url;
      }
      const book = await createBook({
        clerkId: userId,
        title: data.title,
        author: data.author,
        persona: data.voice,
        fileURL: uploadedPdfBlob.url,
        fileBlobKey: uploadedPdfBlob.pathname,
        coverURL: coverUrl,
        fileSize: pdfFile.size,

      });

      if (!book.success) {
        const cleanupResult = await deleteBookBlobs([uploadedPdfBlob.url, coverUrl]);
        if (!cleanupResult.success) {
          console.warn("Failed to delete orphaned upload blobs", cleanupResult.error);
        }
        toast.error(book.error || "Failed to create a book");
        if (book.limitReached) {
          router.push("/subscriptions");
        }
        return;
      }
      if (book.alreadyExists) {
        const cleanupResult = await deleteBookBlobs([uploadedPdfBlob.url, coverUrl]);
        if (!cleanupResult.success) {
          console.warn("Failed to delete duplicate upload blobs", cleanupResult.error);
        }
        toast.info("Book with same name already exists");
        form.reset();
        router.push(`/books/${book.data.slug}`);
        return;

      }
      const segments = await saveBookSegments(book.data._id, userId, parsedPDF.content);
      if (!segments.success) {
        toast.error("Failed to save book segments");
        throw new Error("Failed to save book segments");
      }
      form.reset();
      router.push("/");

    } catch (error) {
      console.log(error);
      toast.error("Failed to upload book. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }

  };

  if (!isMounted) return null;

  const pdfFile = form.watch("pdfFile");
  const coverImage = form.watch("coverImage");
  const selectedVoice = form.watch("voice");

  return (
    <>
      {isSubmitting && (
        <div className="loading-wrapper">
          <div className="loading-shadow-wrapper bg-white shadow-soft-lg">
            <div className="loading-shadow">
              <Loader2 className="loading-animation w-12 h-12 text-[#663820]" />
              <p className="loading-title">Processing your book…</p>
            </div>
          </div>
        </div>
      )}

      <div className="new-book-wrapper">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* PDF Upload */}
          <div>
            <label className="form-label">Book PDF File</label>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  form.setValue("pdfFile", file, { shouldValidate: true });
              }}
            />
            <div
              className={`upload-dropzone border-2 border-dashed border-(--border-medium) ${pdfFile ? "upload-dropzone-uploaded" : ""}`}
              onClick={() => pdfInputRef.current?.click()}
            >
              {pdfFile ? (
                <div className="flex items-center gap-3">
                  <span className="upload-dropzone-text truncate max-w-70">
                    {pdfFile.name}
                  </span>
                  <button
                    type="button"
                    className="upload-dropzone-remove shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      form.setValue(
                        "pdfFile",
                        undefined as unknown as File,
                        { shouldValidate: true }
                      );
                      if (pdfInputRef.current) pdfInputRef.current.value = "";
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="upload-dropzone-icon" />
                  <p className="upload-dropzone-text">Click to upload PDF</p>
                  <p className="upload-dropzone-hint">PDF file (max 50MB)</p>
                </>
              )}
            </div>
            {form.formState.errors.pdfFile && (
              <p className="text-red-500 text-sm mt-1.5">
                {form.formState.errors.pdfFile.message}
              </p>
            )}
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="form-label">
              Cover Image{" "}
              <span className="text-[#999] font-normal">(Optional)</span>
            </label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  form.setValue("coverImage", file, { shouldValidate: true });
              }}
            />
            <div
              className={`upload-dropzone border-2 border-dashed border-(--border-medium) ${coverImage ? "upload-dropzone-uploaded" : ""}`}
              onClick={() => coverInputRef.current?.click()}
            >
              {coverImage ? (
                <div className="flex items-center gap-3">
                  <span className="upload-dropzone-text truncate max-w-70">
                    {coverImage.name}
                  </span>
                  <button
                    type="button"
                    className="upload-dropzone-remove shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      form.setValue("coverImage", undefined, {
                        shouldValidate: true,
                      });
                      if (coverInputRef.current)
                        coverInputRef.current.value = "";
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon className="upload-dropzone-icon" />
                  <p className="upload-dropzone-text">
                    Click to upload cover image
                  </p>
                  <p className="upload-dropzone-hint">
                    Leave empty to auto-generate from PDF
                  </p>
                </>
              )}
            </div>
            {form.formState.errors.coverImage && (
              <p className="text-red-500 text-sm mt-1.5">
                {form.formState.errors.coverImage.message}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="form-label">Title</label>
            <input
              {...form.register("title")}
              className="form-input border border-(--border-subtle)"
              placeholder="ex: Rich Dad Poor Dad"
            />
            {form.formState.errors.title && (
              <p className="text-red-500 text-sm mt-1.5">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Author */}
          <div>
            <label className="form-label">Author Name</label>
            <input
              {...form.register("author")}
              className="form-input border border-(--border-subtle)"
              placeholder="ex: Robert Kiyosaki"
            />
            {form.formState.errors.author && (
              <p className="text-red-500 text-sm mt-1.5">
                {form.formState.errors.author.message}
              </p>
            )}
          </div>

          {/* Voice Selector */}
          <div>
            <label className="form-label">Choose Assistant Voice</label>
            <div className="space-y-4 mt-1">
              {/* Male Voices */}
              <div>
                <p className="text-sm text-(--text-secondary) mb-3">
                  Male Voices
                </p>
                <div className="voice-selector-options">
                  {voiceCategories.male.map((voiceKey) => {
                    const voice =
                      voiceOptions[voiceKey as keyof typeof voiceOptions];
                    const isSelected = selectedVoice === voiceKey;
                    return (
                      <label
                        key={voiceKey}
                        className={`voice-selector-option justify-start! ${isSelected
                          ? "voice-selector-option-selected"
                          : "voice-selector-option-default"
                          }`}
                      >
                        <input
                          type="radio"
                          value={voiceKey}
                          {...form.register("voice")}
                          className="mt-0.5 accent-[#663820] shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-sm text-(--text-primary)">
                            {voice.name}
                          </p>
                          <p className="text-xs text-(--text-secondary) leading-tight mt-0.5">
                            {voice.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Female Voices */}
              <div>
                <p className="text-sm text-(--text-secondary) mb-3">
                  Female Voices
                </p>
                <div className="voice-selector-options">
                  {voiceCategories.female.map((voiceKey) => {
                    const voice =
                      voiceOptions[voiceKey as keyof typeof voiceOptions];
                    const isSelected = selectedVoice === voiceKey;
                    return (
                      <label
                        key={voiceKey}
                        className={`voice-selector-option justify-start! ${isSelected
                          ? "voice-selector-option-selected"
                          : "voice-selector-option-default"
                          }`}
                      >
                        <input
                          type="radio"
                          value={voiceKey}
                          {...form.register("voice")}
                          className="mt-0.5 accent-[#663820] shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-sm text-(--text-primary)">
                            {voice.name}
                          </p>
                          <p className="text-xs text-(--text-secondary) leading-tight mt-0.5">
                            {voice.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            {form.formState.errors.voice && (
              <p className="text-red-500 text-sm mt-1.5">
                {form.formState.errors.voice.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="form-btn"
            disabled={isSubmitting}
          >
            Begin Synthesis
          </button>
        </form>
      </div>
    </>
  );
};

export default UploadForm;
