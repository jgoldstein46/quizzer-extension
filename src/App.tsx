import { useEffect } from 'react';
import './App.css';

function App() {
  useEffect(() => {
    // Register the sidebar to be available on all pages
    if (chrome.sidePanel) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  }, []);

  const onClick = () => {
    chrome.tabs.create({url: 'https://google.com'});
  }

  return (
    <div className="sidebar-container p-4 h-full flex flex-col">
      <h1 className="text-xl font-bold mb-4">Quizzer Sidebar</h1>
      
      <div className="flex-grow overflow-auto">
        <div className="card mb-4">
          <button 
            onClick={onClick}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Google
          </button>
        </div>
        
        <div className="mb-4">
          <p>
            This extension now runs as a sidebar panel.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Edit <code>src/App.tsx</code> to customize your sidebar
          </p>
        </div>
      </div>
      
      <footer className="text-xs text-gray-500 mt-auto pt-2 border-t">
        Quizzer Sidebar Extension v1.0
      </footer>
    </div>
  );
}

export default App
