"use server"
import { connnectToDatabase } from "@/database/mongoose";
import { CreateBook, TextSegment } from "@/types";
import { generateSlug, serializeData } from "../utils";
import BookSegment from "@/database/models/bookSegment.model";
import Book from "@/database/models/book.model";


export const getAllBooks = async () => {
    try {
        await connnectToDatabase();
        const books = await Book.find().sort({ createdAt: -1 }).lean();

        return {
            success: true,
            data: serializeData(books)
        }

    }
    catch (e) {
        console.error("Error Connecting to database", e);
        return {
            success: false, error: e
        }

    }

}
export const getBookBySlug = async (slug: string) => {
    try {
        await connnectToDatabase();
        const book = await Book.findOne({ slug }).lean();
        if (!book) return { success: false, error: "Book not found" };
        return { success: true, data: serializeData(book) };
    } catch (e) {
        console.error("Error fetching book by slug", e);
        return { success: false, error: e };
    }
}

export const checkBookExists = async (title: string) => {

    try {
        await connnectToDatabase();
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
            error: e,
        }
    }

}

export const createBook = async (data: CreateBook) => {
    try {

        await connnectToDatabase();

        const slug = generateSlug(data.title);
        const existingBook = await Book.findOne({ slug }).lean();
        if (existingBook) {
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true,
            }
        }

        const book = await Book.create({ ...data, slug, totalSegments: 0 });

        return { success: true, data: serializeData(book) }

    }
    catch (e) {
        console.error("Error creating a book", e);
        return {
            success: false,
            error: e
        }
    }

}
export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {


    try {

        await connnectToDatabase();
        console.log("Saving  book segments");

        const segmentsToInsert = segments.map(({ text, segmentIndex, pageNumber, wordCount }) => ({
            clerkId, bookId, content: text, segmentIndex, pageNumber, wordCount
        }));
        await BookSegment.insertMany(segmentsToInsert);
        await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length });
        console.log("Successfully saved");

        return {
            success: true,
            data: { segmentsCreated: segments.length }
        }

    }
    catch (e) {
        console.error("Error saving the book segments", e);
        await BookSegment.deleteMany({ bookId });
        await Book.findByIdAndDelete(bookId);
        console.log("Deleted book segments and book due to failure to save segemnts")
        return {
            success: false,
            error: e,
        }
    }
}