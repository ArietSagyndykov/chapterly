import { getBookBySlug } from "@/lib/actions/book.actions";
import { IBook } from "@/types";
import Image from "next/image";
import { notFound } from "next/navigation";

interface BookPageProps {
    params: Promise<{ slug: string }>;
}

const BookPage = async ({ params }: BookPageProps) => {
    const { slug } = await params;
    const result = await getBookBySlug(slug);

    if (!result.success) {
        if (result.notFound) notFound();
        throw new Error(result.error);
    }

    if (!result.data) notFound();

    const book = result.data as IBook;

    return (
        <main className="flex flex-col items-center px-6 py-12 max-w-4xl mx-auto w-full">
            <div className="flex flex-col md:flex-row gap-10 w-full">
                {book.coverURL && (
                    <Image
                        src={book.coverURL}
                        alt={book.title}
                        width={200}
                        height={300}
                        className="rounded-lg object-cover shadow-md shrink-0"
                    />
                )}
                <div className="flex flex-col gap-3 justify-center">
                    <h1 className="text-3xl font-bold">{book.title}</h1>
                    <p className="text-lg text-gray-500">{book.author}</p>
                    <p className="text-sm text-gray-400">{book.totalSegments} segments processed</p>
                </div>
            </div>
        </main>
    );
};

export default BookPage;
