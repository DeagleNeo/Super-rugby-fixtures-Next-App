// import { useState, useEffect } from 'react';
// import Link from 'next/link';

// const SearchResults = () => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [fixtures, setFixtures] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [selectedFixture, setSelectedFixture] = useState(null);
//   const [error, setError] = useState(null);

//   // Debounced search implementation
//   useEffect(() => {
//     const searchFixtures = async () => {
//       if (searchTerm.trim().length < 2) {
//         setFixtures([]);
//         return;
//       }

//       setLoading(true);
//       setError(null);
      
//       try {
//         const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
//         if (!response.ok) {
//           throw new Error(`Search failed: ${response.statusText}`);
//         }
        
//         const data = await response.json();
//         setFixtures(data.fixtures || []);
//       } catch (err) {
//         console.error('Search error:', err);
//         setError('Failed to load fixtures. Please try again.');
//         setFixtures([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     const debounceTimer = setTimeout(searchFixtures, 300);
//     return () => clearTimeout(debounceTimer);
//   }, [searchTerm]);

//   const fetchFixtureDetails = async (fixtureId) => {
//     try {
//       setLoading(true);
//       const response = await fetch(`/api/fixture/${fixtureId}`);
//       if (!response.ok) {
//         throw new Error(`Failed to fetch fixture details: ${response.statusText}`);
//       }
      
//       const data = await response.json();
//       setSelectedFixture(data.fixture);
//     } catch (err) {
//       console.error('Fixture fetch error:', err);
//       setError('Failed to load fixture details.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const closeModal = () => {
//     setSelectedFixture(null);
//   };

//   // Format date for display
//   const formatDate = (dateString) => {
//     const options = { 
//       weekday: 'long', 
//       year: 'numeric', 
//       month: 'long', 
//       day: 'numeric' 
//     };
//     return new Date(dateString).toLocaleDateString('en-AU', options);
//   };

//   // Format time for display
//   const formatTime = (dateString) => {
//     return new Date(dateString).toLocaleTimeString('en-AU', {
//       hour: '2-digit',
//       minute: '2-digit',
//       timeZone: 'Australia/Sydney'
//     });
//   };

//   return (
//     <div className="w-full max-w-4xl mx-auto">
//       <div className="mb-6">
//         <label className="block text-lg font-medium text-gray-800 mb-2">
//           Search Rugby Fixtures
//         </label>
//         <input
//           type="text"
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           placeholder="Search teams (e.g., Crusaders, Waratahs, Blues...)"
//           className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
//         />
//         <p className="mt-2 text-sm text-gray-500">
//           Type at least 2 characters to start searching
//         </p>
//       </div>

//       {error && (
//         <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
//           {error}
//         </div>
//       )}

//       {loading && (
//         <div className="flex justify-center items-center py-8">
//           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
//           <span className="ml-3 text-gray-600">Searching fixtures...</span>
//         </div>
//       )}

//       {!loading && searchTerm.length >= 2 && fixtures.length === 0 && (
//         <div className="text-center py-8 text-gray-600">
//           No fixtures found for "{searchTerm}"
//         </div>
//       )}

//       {fixtures.length > 0 && (
//         <div className="space-y-4">
//           <h3 className="text-xl font-semibold text-gray-800 mb-4">
//             {fixtures.length} Match{fixtures.length !== 1 ? 'es' : ''} Found
//           </h3>
          
//           <div className="grid gap-4">
//             {fixtures.map((fixture) => (
//               <div
//                 key={fixture._id}
//                 onClick={() => fetchFixtureDetails(fixture._id)}
//                 className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
//               >
//                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
//                   <div className="flex-1">
//                     <div className="flex items-center mb-2">
//                       <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
//                       <div className="ml-4">
//                         <h4 className="text-lg font-bold text-gray-900">
//                           {fixture.home_team} 
//                           <span className="mx-2 text-red-500">vs</span> 
//                           {fixture.away_team}
//                         </h4>
//                         <p className="text-sm text-gray-600">
//                           {fixture.competition_name} • Round {fixture.fixture_round}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
                  
//                   <div className="mt-3 md:mt-0 text-right">
//                     <div className="text-lg font-semibold text-gray-800">
//                       {formatDate(fixture.fixture_datetime)}
//                     </div>
//                     <div className="text-md text-gray-600">
//                       {formatTime(fixture.fixture_datetime)}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Fixture Detail Modal */}
//       {selectedFixture && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//             <div className="p-6">
//               <div className="flex justify-between items-center mb-4">
//                 <h2 className="text-2xl font-bold text-gray-900">Fixture Details</h2>
//                 <button
//                   onClick={closeModal}
//                   className="text-gray-500 hover:text-gray-700 text-2xl"
//                 >
//                   &times;
//                 </button>
//               </div>

//               <div className="mb-6 text-center">
//                 <div className="flex justify-center items-center space-x-8 mb-4">
//                   <div className="text-center">
//                     <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-2" />
//                     <h3 className="text-xl font-bold">{selectedFixture.home_team}</h3>
//                   </div>
                  
//                   <div className="text-red-500 text-2xl font-bold">VS</div>
                  
//                   <div className="text-center">
//                     <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-2" />
//                     <h3 className="text-xl font-bold">{selectedFixture.away_team}</h3>
//                   </div>
//                 </div>
                
//                 <div className="text-xl font-semibold text-blue-600 mb-2">
//                   {formatDate(selectedFixture.fixture_datetime)}
//                 </div>
//                 <div className="text-lg text-gray-700">
//                   {formatTime(selectedFixture.fixture_datetime)}
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//                 <div className="bg-gray-50 p-4 rounded-lg">
//                   <h4 className="font-semibold text-gray-700 mb-2">Competition</h4>
//                   <p>{selectedFixture.competition_name}</p>
//                 </div>
                
//                 <div className="bg-gray-50 p-4 rounded-lg">
//                   <h4 className="font-semibold text-gray-700 mb-2">Season</h4>
//                   <p>{selectedFixture.season}</p>
//                 </div>
                
//                 <div className="bg-gray-50 p-4 rounded-lg">
//                   <h4 className="font-semibold text-gray-700 mb-2">Round</h4>
//                   <p>{selectedFixture.fixture_round}</p>
//                 </div>
                
//                 <div className="bg-gray-50 p-4 rounded-lg">
//                   <h4 className="font-semibold text-gray-700 mb-2">Fixture ID</h4>
//                   <p className="truncate">{selectedFixture.fixture_mid}</p>
//                 </div>
//               </div>

//               <div className="flex justify-center space-x-4 mt-6">
//                 <button
//                   onClick={closeModal}
//                   className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
//                 >
//                   Close
//                 </button>
//                 <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
//                   Save Fixture
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="mt-8 text-center">
//         <Link 
//           href="/" 
//           className="inline-flex items-center text-blue-600 hover:text-blue-800"
//         >
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
//             <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
//           </svg>
//           Back to Upload
//         </Link>
//       </div>
//     </div>
//   );
// };

// export default SearchResults;

import { useState, useEffect } from 'react';
import Link from 'next/link';

const SearchResults = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [error, setError] = useState(null);
  const [savedFixtures, setSavedFixtures] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load saved fixtures from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('savedFixtures');
    if (saved) {
      setSavedFixtures(JSON.parse(saved));
    }
  }, []);

  // Debounced search implementation
  useEffect(() => {
    const searchFixtures = async () => {
      if (searchTerm.trim().length < 2) {
        setFixtures([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        setFixtures(data.fixtures || []);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to load fixtures. Please try again.');
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchFixtures, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const fetchFixtureDetails = async (fixtureId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fixture/${fixtureId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch fixture details: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSelectedFixture(data.fixture);
    } catch (err) {
      console.error('Fixture fetch error:', err);
      setError('Failed to load fixture details.');
    } finally {
      setLoading(false);
    }
  };

  const saveFixture = async () => {
    if (!selectedFixture) return;

    // Check if fixture is already saved
    const isAlreadySaved = savedFixtures.some(
      fixture => fixture._id === selectedFixture._id || fixture.fixture_mid === selectedFixture.fixture_mid
    );

    if (isAlreadySaved) {
      setSaveMessage('This fixture is already saved!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      // Option 1: Save to backend database
      const response = await fetch('/api/fixture/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedFixture),
      });

      if (response.ok) {
        // Update local state
        const updatedSavedFixtures = [...savedFixtures, selectedFixture];
        setSavedFixtures(updatedSavedFixtures);
        
        // Save to localStorage as backup
        localStorage.setItem('savedFixtures', JSON.stringify(updatedSavedFixtures));
        
        setSaveMessage('Fixture saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        throw new Error('Failed to save fixture to database');
      }
    } catch (err) {
      console.error('Save error:', err);
      
      // Fallback: Save to localStorage only
      try {
        const updatedSavedFixtures = [...savedFixtures, selectedFixture];
        setSavedFixtures(updatedSavedFixtures);
        localStorage.setItem('savedFixtures', JSON.stringify(updatedSavedFixtures));
        
        setSaveMessage('Fixture saved locally (backup mode)');
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (localErr) {
        console.error('Local save error:', localErr);
        setSaveMessage('Failed to save fixture. Please try again.');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const removeFixture = (fixtureId) => {
    const updatedSavedFixtures = savedFixtures.filter(
      fixture => fixture._id !== fixtureId && fixture.fixture_mid !== fixtureId
    );
    setSavedFixtures(updatedSavedFixtures);
    localStorage.setItem('savedFixtures', JSON.stringify(updatedSavedFixtures));
  };

  const closeModal = () => {
    setSelectedFixture(null);
    setSaveMessage('');
  };

  const isFixtureSaved = (fixture) => {
    return savedFixtures.some(
      saved => saved._id === fixture._id || saved.fixture_mid === fixture.fixture_mid
    );
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-AU', options);
  };

  // Format time for display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney'
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <label className="block text-lg font-medium text-gray-800 mb-2">
          Search Rugby Fixtures
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search teams (e.g., Crusaders, Waratahs, Blues...)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
        />
        <p className="mt-2 text-sm text-gray-500">
          Type at least 2 characters to start searching
        </p>
      </div>

      {/* Saved Fixtures Counter */}
      {savedFixtures.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
          <div className="flex justify-between items-center">
            <span>You have {savedFixtures.length} saved fixture{savedFixtures.length !== 1 ? 's' : ''}</span>
            <Link 
              href="/saved-fixtures" 
              className="text-green-600 hover:text-green-800 font-medium"
            >
              View Saved →
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Searching fixtures...</span>
        </div>
      )}

      {!loading && searchTerm.length >= 2 && fixtures.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          No fixtures found for "{searchTerm}"
        </div>
      )}

      {fixtures.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {fixtures.length} Match{fixtures.length !== 1 ? 'es' : ''} Found
          </h3>
          
          <div className="grid gap-4">
            {fixtures.map((fixture) => (
              <div
                key={fixture._id}
                onClick={() => fetchFixtureDetails(fixture._id)}
                className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300 ${
                  isFixtureSaved(fixture) ? 'border-green-300 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h4 className="text-lg font-bold text-gray-900">
                            {fixture.home_team} 
                            <span className="mx-2 text-red-500">vs</span> 
                            {fixture.away_team}
                          </h4>
                          {isFixtureSaved(fixture) && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Saved
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {fixture.competition_name} • Round {fixture.fixture_round}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 md:mt-0 text-right">
                    <div className="text-lg font-semibold text-gray-800">
                      {formatDate(fixture.fixture_datetime)}
                    </div>
                    <div className="text-md text-gray-600">
                      {formatTime(fixture.fixture_datetime)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixture Detail Modal */}
      {selectedFixture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Fixture Details</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>

              {saveMessage && (
                <div className={`mb-4 p-3 rounded-lg ${
                  saveMessage.includes('successfully') || saveMessage.includes('saved locally')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : saveMessage.includes('already saved')
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {saveMessage}
                </div>
              )}

              <div className="mb-6 text-center">
                <div className="flex justify-center items-center space-x-8 mb-4">
                  <div className="text-center">
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-2" />
                    <h3 className="text-xl font-bold">{selectedFixture.home_team}</h3>
                  </div>
                  
                  <div className="text-red-500 text-2xl font-bold">VS</div>
                  
                  <div className="text-center">
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-2" />
                    <h3 className="text-xl font-bold">{selectedFixture.away_team}</h3>
                  </div>
                </div>
                
                <div className="text-xl font-semibold text-blue-600 mb-2">
                  {formatDate(selectedFixture.fixture_datetime)}
                </div>
                <div className="text-lg text-gray-700">
                  {formatTime(selectedFixture.fixture_datetime)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Competition</h4>
                  <p>{selectedFixture.competition_name}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Season</h4>
                  <p>{selectedFixture.season}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Round</h4>
                  <p>{selectedFixture.fixture_round}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Fixture ID</h4>
                  <p className="truncate">{selectedFixture.fixture_mid}</p>
                </div>
              </div>

              <div className="flex justify-center space-x-4 mt-6">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Close
                </button>
                <button
                  onClick={saveFixture}
                  disabled={saving || isFixtureSaved(selectedFixture)}
                  className={`px-6 py-2 rounded-lg transition ${
                    isFixtureSaved(selectedFixture)
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : saving
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saving 
                    ? 'Saving...' 
                    : isFixtureSaved(selectedFixture)
                    ? 'Already Saved'
                    : 'Save Fixture'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link 
          href="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Upload
        </Link>
      </div>
    </div>
  );
};

export default SearchResults;