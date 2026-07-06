"use server"
import { connectToDatabase } from "@/database/mongoose";
import { CreateBook, TextSegment } from "@/types";
import { escapeRegex, generateSlug, serializeData } from "../utils";
import BookSegment from "@/database/models/bookSegment.model";
import Book from "@/database/models/book.model";
import { getCurrentPlanLimits } from "@/lib/subscription";
import { del } from "@vercel/blob";
import mongoose from "mongoose";

import { revalidatePath } from "next/cache";


const getErrorMessage = (error: unknown, fallback: string) => (
    error instanceof Error ? error.message : fallback
);

export const deleteBookBlobs = async (urls: string[]) => {
    try {
        const urlsToDelete = urls.filter(Boolean);
        if (urlsToDelete.length === 0) return { success: true };

        await del(urlsToDelete);
        return { success: true };
    }
    catch (e) {
        console.error("Error deleting book blobs", e);
        return {
            success: false,
            error: getErrorMessage(e, "Failed to delete book blobs"),
        }
    }
}

export const getAllBooks = async () => {
    try {
        await connectToDatabase();
        const books = await Book.find().sort({ createdAt: -1 }).lean();

        return {
            success: true,
            data: serializeData(books)
        }

    }
    catch (e) {
        console.error("Error Connecting to database", e);
        return {
            success: false,
            error: getErrorMessage(e, "Failed to fetch books"),
        }

    }

}
export const getBookBySlug = async (slug: string) => {
    try {
        await connectToDatabase();
        const book = await Book.findOne({ slug }).lean();
        if (!book) return { success: false, notFound: true, error: "Book not found" };
        return { success: true, data: serializeData(book) };
    } catch (e) {
        console.error("Error fetching book by slug", e);
        return { success: false, notFound: false, error: getErrorMessage(e, "Failed to fetch book") };
    }
}

export const checkBookExists = async (title: string) => {

    try {
        await connectToDatabase();
        const slug = generateSlug(title);

        const existingBook = await Book.findOne({ slug }).lean();
        if (existingBook) {
            return {
                exists: true,
                book: serializeData(existingBook)
            }
        }

        return { exists: false }

    }
    catch (e) {
        console.error("Error cheking the book exists", e);
        return {
            exists: false,
            error: getErrorMessage(e, "Failed to check book"),
        }
    }

}

export const createBook = async (data: CreateBook) => {
    try {

        await connectToDatabase();

        const slug = generateSlug(data.title);
        const existingBook = await Book.findOne({ slug }).lean();
        if (existingBook) {
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true,
            }
        }

        const { limits } = await getCurrentPlanLimits();
        const bookCount = await Book.countDocuments({ clerkId: data.clerkId });
        if (bookCount >= limits.maxBooks) {
            return {
                success: false,
                error: `You've reached your ${limits.planName} plan limit of ${limits.maxBooks} book${limits.maxBooks === 1 ? "" : "s"}. Upgrade your plan to add more.`,
                limitReached: true,
            }
        }

        const book = await Book.create({ ...data, slug, totalSegments: 0 });
        revalidatePath("/");


        return { success: true, data: serializeData(book) }

    }
    catch (e) {
        console.error("Error creating a book", e);
        return {
            success: false,
            error: getErrorMessage(e, "Failed to create book")
        }
    }

}
export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {


    try {

        const db = await connectToDatabase();
        const session = await db.startSession();
        console.log("Saving  book segments");

        try {
            await session.withTransaction(async () => {
                const segmentsToInsert = segments.map(({ text, segmentIndex, pageNumber, wordCount }) => ({
                    clerkId, bookId, content: text, segmentIndex, pageNumber, wordCount
                }));
                await BookSegment.insertMany(segmentsToInsert, { session });
                const book = await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length }, { session });
                if (!book) throw new Error("Book not found");
            });
            console.log("Successfully saved");
        }
        finally {
            await session.endSession();
        }

        return {
            success: true,
            data: { segmentsCreated: segments.length }
        }

    }
    catch (e) {
        console.error("Error saving the book segments", e);
        return {
            success: false,
            error: getErrorMessage(e, "Failed to save book segments"),
        }
    }
}

export const searchBookSegments = async (bookId: string, query: string, limit: number = 5) => {
    try {
        await connectToDatabase();

        console.log(`Searching for: "${query}" in book ${bookId}`);

        const bookObjectId = new mongoose.Types.ObjectId(bookId);

        // Try MongoDB text search first (requires text index)
        let segments: Record<string, unknown>[] = [];
        try {
            segments = await BookSegment.find({
                bookId: bookObjectId,
                $text: { $search: query },
            })
                .select('_id bookId content segmentIndex pageNumber wordCount')
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit)
                .lean();
        } catch {
            // Text index may not exist — fall through to regex fallback
            segments = [];
        }

        // Fallback: regex search matching ANY keyword
        if (segments.length === 0) {
            const keywords = query.split(/\s+/).filter((k) => k.length > 2);

            if (keywords.length > 0) {
                const pattern = keywords.map(escapeRegex).join('|');

                segments = await BookSegment.find({
                    bookId: bookObjectId,
                    content: { $regex: pattern, $options: 'i' },
                })
                    .select('_id bookId content segmentIndex pageNumber wordCount')
                    .sort({ segmentIndex: 1 })
                    .limit(limit)
                    .lean();
            }
        }

        console.log(`Search complete. Found ${segments.length} results`);

        return {
            success: true,
            data: serializeData(segments),
        };
    } catch (error) {
        console.error('Error searching segments:', error);
        return {
            success: false,
            error: (error as Error).message,
            data: [],
        };
    }
};