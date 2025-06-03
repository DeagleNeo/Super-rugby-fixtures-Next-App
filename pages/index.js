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
