import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import CSVUploader from '../components/CSVUploader';

export default function Home() {
  const [uploadResult, setUploadResult] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Super Rugby Fixtures Manager</title>
        <meta name="description" content="Upload and search Super Rugby Pacific fixtures" />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">
            🏉 Super Rugby Fixtures Manager
          </h1>
          <p className="text-gray-600">
            Secure upload and search for Super Rugby Pacific fixtures
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📁 Upload Fixtures CSV
          </h2>
          
          <CSVUploader onUploadSuccess={setUploadResult} />
          
          {uploadResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={uploadResult.success ? 'text-green-700' : 'text-red-700'}>
                {uploadResult.message}
              </p>
              {uploadResult.sample && (
                <div className="mt-3">
                  <h4 className="font-medium text-gray-700">Sample Uploaded Fixtures:</h4>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {uploadResult.sample.map((fixture, idx) => (
                      <li key={idx} className="text-sm text-gray-600">
                        {fixture.home_team} vs {fixture.away_team} - 
                        Round {fixture.fixture_round} ({new Date(fixture.fixture_datetime).toLocaleDateString()})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center mb-8">
          <Link 
            href="/search" 
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition duration-300"
          >
            🔍 Search Fixtures
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-medium text-gray-800 mb-3">📋 CSV Format Requirements</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><strong>Required columns:</strong> fixture_mid, season, competition_name, fixture_datetime, fixture_round, home_team, away_team</li>
            <li><strong>Date format:</strong> YYYY-MM-DD HH:MM:SS.mmm (e.g., 2024-02-18 08:45:00.000)</li>
            <li><strong>Max file size:</strong> 100MB</li>
            <li><strong>Security:</strong> Files are scanned for malicious content before processing</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

// import Image from "next/image";
// import { Geist, Geist_Mono } from "next/font/google";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export default function Home() {
//   return (
//     <div
//       className={`${geistSans.className} ${geistMono.className} grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]`}
//     >
//       <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={180}
//           height={38}
//           priority
//         />
//         <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
//           <li className="mb-2 tracking-[-.01em]">
//             Get started by editing{" "}
//             <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
//               pages/index.js
//             </code>
//             .
//           </li>
//           <li className="tracking-[-.01em]">
//             Save and see your changes instantly.
//           </li>
//         </ol>
//         <div className="flex gap-4 items-center flex-col sm:flex-row">
//           <a
//             className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={20}
//               height={20}
//             />
//             Deploy now
//           </a>
//           <a
//             className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Read our docs
//           </a>
//         </div>
//       </main>
//       <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/file.svg"
//             alt="File icon"
//             width={16}
//             height={16}
//           />
//           Learn
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/window.svg"
//             alt="Window icon"
//             width={16}
//             height={16}
//           />
//           Examples
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/globe.svg"
//             alt="Globe icon"
//             width={16}
//             height={16}
//           />
//           Go to nextjs.org →
//         </a>
//       </footer>
//     </div>
//   );
// }
