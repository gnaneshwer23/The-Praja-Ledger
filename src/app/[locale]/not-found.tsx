import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <header className="intro">
      <h1>That page is not in the book</h1>
      <p>
        The address does not match a section or a leader in this edition.
      </p>
      <p>
        <Link href="/">Back to the overview</Link>
      </p>
    </header>
  );
}
