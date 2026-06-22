import Image from "next/image";
import Link from "next/link";

const steps = [
  { number: 1, title: "Upload PDF", description: "Add your book file" },
  { number: 2, title: "AI Processing", description: "We analyze the content" },
  { number: 3, title: "Voice Chat", description: "Discuss with AI" },
];

const HeroSection = () => {
  return (
    <section className="pt-28 mb-10 md:mb-16">
      <div className="library-hero-card">
        <div className="library-hero-content">
          {/* Left — text + CTA */}
          <div className="library-hero-text">
            <h1 className="library-hero-title">Your Library</h1>
            <p className="library-hero-description">
              Convert your books into interactive AI conversations. Listen,
              learn, and discuss your favorite reads.
            </p>

            {/* Mobile illustration */}
            <div className="library-hero-illustration">
              <Image
                src="/assets/hero-illustration.png"
                alt="Books and globe illustration"
                width={260}
                height={200}
                className="object-contain"
              />
            </div>

            <Link href="/books/new" className="library-cta-primary">
              + Add new book
            </Link>
          </div>

          {/* Center — illustration (desktop only) */}
          <div className="library-hero-illustration-desktop">
            <Image
              src="/assets/hero-illustration.png"
              alt="Books and globe illustration"
              width={320}
              height={240}
              className="object-contain"
            />
          </div>

          {/* Right — steps card */}
          <ul className="library-steps-card flex flex-col gap-4 shrink-0 w-full lg:w-auto lg:min-w-55">
            {steps.map((step) => (
              <li key={step.number} className="library-step-item">
                <span className="library-step-number">{step.number}</span>
                <div className="text-left">
                  <p className="library-step-title">{step.title}</p>
                  <p className="library-step-description">{step.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
