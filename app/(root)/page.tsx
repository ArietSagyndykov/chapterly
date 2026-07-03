import BookCard from "@/components/ui/BookCard";
import HeroSection from "@/components/ui/HeroSection";
import { getAllBooks } from "@/lib/actions/book.actions";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unable to load books. Please try again later.";
};

const Page = async () => {

  const bookResults = await getAllBooks();
  const books = bookResults.success ? bookResults.data ?? [] : [];
  const errorMessage = bookResults.success ? null : getErrorMessage(bookResults.error);


  return (
    <main className="wrapper container">
      <HeroSection />
      {errorMessage && (
        <div className="error-banner" role="alert">
          <div className="error-banner-content">
            <p className="text-sm font-medium text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}
      <div className="library-books-grid">

        {books.map((book) => (
          <BookCard
            key={book._id}
            title={book.title}
            author={book.author}
            coverURL={book.coverURL}
            slug={book.slug}
          />
        ))}
      </div>
    </main>
  );
};

export default Page;
