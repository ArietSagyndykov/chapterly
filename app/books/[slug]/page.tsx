import VapiControls from "@/components/VapiControls";
import { getBookBySlug } from "@/lib/actions/book.actions";
import { IBook } from "@/types";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

interface BookPageProps {
    params: Promise<{ slug: string }>;
}

const BookPage = async ({ params }: BookPageProps) => {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const { slug } = await params;
    const result = await getBookBySlug(slug);

    if (!result.success) {
        if (result.notFound) redirect("/");
        throw new Error(result.error);
    }

    if (!result.data) redirect("/");

    const book = result.data as IBook;
    const voice = book.persona || "Default";

    return (
        <>
            <Link href="/" className="back-btn-floating" aria-label="Back to library">
                <ArrowLeft className="size-5 text-[#212a3b]" />
            </Link>

            <main className="book-page-container">


                <VapiControls book={book} />
            </main>
        </>
    );
};

export default BookPage;
