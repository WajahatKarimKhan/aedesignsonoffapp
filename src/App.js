import React, { useState, useEffect, useRef } from 'react';

// --- MODIFIED LINES ---
// The URL of your LIVE FastAPI backend on Render
const BACKEND_URL = 'https://aedesign-sonoff-backend.onrender.com';

// The WebSocket URL for your LIVE backend. Use 'wss' for secure connections!
const WEBSOCKET_URL = 'wss://aedesign-sonoff-backend.onrender.com/ws';
// --- END MODIFICATION ---

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // useRef is used to hold the WebSocket object.
  // This prevents it from being recreated on every render.
  const ws = useRef(null);

  // This effect runs once on component mount to check the user's auth status.
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/status`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.authenticated);
        } else {
          setError('Failed to check authentication status.');
        }
      } catch (err) {
        setError('Cannot connect to the backend. Is it running?');
      } finally {
        setLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  // This effect manages the WebSocket connection based on authentication state.
  useEffect(() => {
    if (isAuthenticated) {
      // Connect to WebSocket if authenticated and not already connected.
      if (!ws.current) {
        ws.current = new WebSocket(WEBSOCKET_URL);

        ws.current.onopen = () => {
          console.log('WebSocket connected');
          setStatusMessage('Connected to server. Ready to fetch data.');
        };

        ws.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('Received data from WebSocket:', data);
          if (data.error) {
             setError(`Error from server: ${data.details || data.error}`);
             setUserData(null);
          } else {
             setUserData(data);
             setError(null); // Clear previous errors
          }
          setStatusMessage('Data received!');
        };

        ws.current.onerror = (event) => {
          console.error('WebSocket error:', event);
          setError('A WebSocket error occurred. Connection may be lost.');
        };

        ws.current.onclose = () => {
          console.log('WebSocket disconnected');
          setStatusMessage('Disconnected from server.');
          ws.current = null; // Clear the ref on close
        };
      }
    } else {
      // If not authenticated, ensure any existing WebSocket is closed.
      if (ws.current) {
        ws.current.close();
      }
    }

    // Cleanup function: This will be called when the component unmounts
    // or before the effect runs again.
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        console.log('Closing WebSocket connection on cleanup.');
        ws.current.close();
      }
    };
  }, [isAuthenticated]); // This effect depends on the authentication state.


  const handleLogin = () => {
    window.location.href = `${BACKEND_URL}/login`;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserData(null);
    window.location.href = `${BACKEND_URL}/logout`;
  };
  
  const handleGetData = async () => {
    setStatusMessage('Requesting data from eWeLink...');
    setUserData(null); // Clear previous data
    setError(null);
    try {
        // This HTTP request tells the backend to fetch data and PUSH it
        // over the WebSocket. We don't need the response data here.
        const response = await fetch(`${BACKEND_URL}/api/get-data`, { credentials: 'include' });
        const result = await response.json();
        
        if (!response.ok) {
            // If the initial HTTP request fails, show an error.
            setError(result.detail?.error || result.detail || 'Failed to trigger data fetch.');
            setStatusMessage('');
        }
    } catch (err) {
        setError('Failed to send data request to backend.');
        setStatusMessage('');
    }
  };


  const renderContent = () => {
    if (loading) {
      return <p className="text-gray-400">Checking authentication...</p>;
    }
    
    if (isAuthenticated) {
      return (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white">eWeLink Control Panel</h2>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
            >
              Logout
            </button>
          </div>
           <div className="text-center mb-6">
             <button
                onClick={handleGetData}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!ws.current || ws.current.readyState !== WebSocket.OPEN}
             >
                Fetch Device Data
             </button>
             <p className="text-sm text-gray-400 mt-3 h-4">{statusMessage}</p>
          </div>
          
          {error && <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-lg mb-4">{error}</div>}

          {userData ? (
              <pre className="bg-gray-900 text-green-300 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(userData, null, 2)}
              </pre>
          ) : (
            <div className="text-center text-gray-400 bg-gray-800 p-6 rounded-lg">
                Click the button above to fetch your device data.
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white mb-2">eWeLink Data Fetcher</h2>
        <p className="text-gray-400 mb-6">Login to connect to the server and view your eWeLink device data in real-time.</p>
        <button
          onClick={handleLogin}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105"
        >
          Login with eWeLink
        </button>
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    );
  };
  
  return (
    <div className="bg-gray-800 text-white min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-gray-700 rounded-xl shadow-2xl p-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;


