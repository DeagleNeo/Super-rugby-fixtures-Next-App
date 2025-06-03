import { useState, useEffect } from 'react';
import Link from 'next/link';

const SavedFixtures = () => {
  const [savedFixtures, setSavedFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSavedFixtures();
  }, []);

  const fetchSavedFixtures = async () => {
    try {
      setLoading(true);
      setError(null);
      setSavedFixtures([]); // Clear existing fixtures first

      // Try to fetch from backend first
      try {
        const response = await fetch('/api/fixture/save');
        if (response.ok) {
          const data = await response.json();
          setSavedFixtures(data.fixtures || []);
          
          // Sync localStorage with backend data
          localStorage.setItem('savedFixtures', JSON.stringify(data.fixtures || []));
          return;
        }
      } catch (backendError) {
        console.log('Backend unavailable, falling back to localStorage');
      }

      // Fallback to localStorage
      const localSaved = localStorage.getItem('savedFixtures');
      if (localSaved) {
        const parsedFixtures = JSON.parse(localSaved);
        setSavedFixtures(parsedFixtures);
      }
    } catch (err) {
      console.error('Failed to load saved fixtures:', err);
      setError('Failed to load saved fixtures');
      setSavedFixtures([]); // Ensure empty state on error
    } finally {
      setLoading(false);
    }
  };

  const deleteFixture = async (fixture) => {
    const fixtureId = fixture._id;
    setDeleting(fixtureId);

    try {
      // Try to delete from backend
      try {
        const response = await fetch(`/api/fixture/save?id=${fixtureId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remove from state
          const updatedFixtures = savedFixtures.filter(f => f._id !== fixtureId);
          setSavedFixtures(updatedFixtures);
          
          // Update localStorage to stay in sync
          localStorage.setItem('savedFixtures', JSON.stringify(updatedFixtures));
          
          setMessage('Fixture deleted successfully');
          setTimeout(() => setMessage(''), 3000);
          return;
        }
      } catch (backendError) {
        console.log('Backend delete failed, removing from localStorage');
      }

      // Fallback: remove from localStorage
      const updatedFixtures = savedFixtures.filter(f => f._id !== fixtureId);
      setSavedFixtures(updatedFixtures);
      localStorage.setItem('savedFixtures', JSON.stringify(updatedFixtures));
      
      setMessage('Fixture removed locally');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setMessage('Failed to delete fixture');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setDeleting(null);
    }
  };

  const clearAllFixtures = async () => {
    if (!window.confirm('Are you sure you want to delete all saved fixtures?')) {
      return;
    }

    try {
      // Clear from state immediately for better UX
      setSavedFixtures([]);
      localStorage.removeItem('savedFixtures');
      
      // Try to clear from backend
      try {
        const response = await fetch('/api/fixture/save/clear', {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setMessage('All fixtures cleared successfully');
        } else {
          setMessage('Fixtures cleared locally');
        }
      } catch (backendError) {
        setMessage('Fixtures cleared locally');
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Clear all error:', err);
      setMessage('Failed to clear fixtures');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const exportFixtures = () => {
    const dataStr = JSON.stringify(savedFixtures, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saved_fixtures_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const closeModal = () => {
    setSelectedFixture(null);
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

  const formatSavedDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading saved fixtures...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Rugby Fixtures</h1>
        <p className="text-gray-600">
          You have {savedFixtures.length} saved fixture{savedFixtures.length !== 1 ? 's' : ''}
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('successfully') || message.includes('removed') || message.includes('cleared')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {savedFixtures.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={exportFixtures}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Export All Fixtures
          </button>
          <button
            onClick={fetchSavedFixtures}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Refresh
          </button>
          <button
            onClick={clearAllFixtures}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Clear All
          </button>
        </div>
      )}

      {savedFixtures.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-xl text-gray-600 mb-2">No saved fixtures yet</h3>
          <p className="text-gray-500 mb-6">Start by searching and saving some rugby fixtures</p>
          <Link 
            href="/search" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Search Fixtures
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedFixtures.map((fixture) => (
            <div
              key={fixture._id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedFixture(fixture)}>
                  <div className="flex items-center mb-2">
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-12 h-12" />
                    <div className="ml-4">
                      <h4 className="text-lg font-bold text-gray-900">
                        {fixture.home_team} 
                        <span className="mx-2 text-red-500">vs</span> 
                        {fixture.away_team}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {fixture.competition_name} • Round {fixture.fixture_round}
                      </p>
                      {fixture.saved_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Saved: {formatSavedDate(fixture.saved_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 lg:mt-0 flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-800">
                      {formatDate(fixture.fixture_datetime)}
                    </div>
                    <div className="text-md text-gray-600">
                      {formatTime(fixture.fixture_datetime)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteFixture(fixture)}
                    disabled={deleting === fixture._id}
                    className={`px-3 py-2 rounded-lg transition ${
                      deleting === fixture._id
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {deleting === fixture._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
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

                {selectedFixture.saved_at && (
                  <div className="bg-green-50 p-4 rounded-lg md:col-span-2">
                    <h4 className="font-semibold text-gray-700 mb-2">Saved</h4>
                    <p>{formatSavedDate(selectedFixture.saved_at)}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center space-x-4 mt-6">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => deleteFixture(selectedFixture)}
                  disabled={deleting === selectedFixture._id}
                  className={`px-6 py-2 rounded-lg transition ${
                    deleting === selectedFixture._id
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {deleting === selectedFixture._id ? 'Deleting...' : 'Delete Fixture'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link 
          href="/search" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mr-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          Search More Fixtures
        </Link>
        <Link 
          href="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default SavedFixtures;