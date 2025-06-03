import Head from 'next/head';
import Link from 'next/link';
import SearchResults from '@/components/SearchResults';

export default function SearchPage() {
  return (
    <>
      <Head>
        <title>Search Fixtures - Super Rugby Manager</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <header className="text-center mb-10">
            <h1 className="text-3xl font-bold text-blue-800 mb-2">
              🔍 Search Super Rugby Fixtures
            </h1>
            <Link 
              href="/" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              ← Back to Upload
            </Link>
          </header>
          
          <SearchResults />
        </div>
      </div>
    </>
  );
}