import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-5 sm:px-8 py-28 text-center">
      <p className="t-label text-accent">404</p>
      <h1 className="t-serif-display mt-4 text-[3rem]">Nothing here.</h1>
      <p className="t-secondary mt-4">
        This page may have moved, been unpublished, or never existed.
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        <ArrowLeft /> Back to all writing
      </Link>
    </div>
  );
}
