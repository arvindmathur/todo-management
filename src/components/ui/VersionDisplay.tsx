'use client';

import { useState, useEffect } from 'react';
import { APP_VERSION } from '@/lib/version';

interface VersionInfo {
  version: string;
  buildDate: string;
  environment: string;
}

export default function VersionDisplay() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Fetch version info from API
    fetch('/api/version')
      .then(res => res.json())
      .then(data => setVersionInfo(data))
      .catch(() => {
        // Fallback to static version
        setVersionInfo({
          version: APP_VERSION,
          buildDate: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
        });
      });
  }, []);

  if (!versionInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className="bg-gray-800 text-white text-xs px-2 py-1 rounded cursor-pointer hover:bg-gray-700 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
        title="Click for version details"
      >
        v{versionInfo.version}
      </div>
      
      {showDetails && (
        <div className="absolute bottom-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64 text-sm">
          <div className="font-semibold text-gray-900 mb-2">Version Info</div>
          <div className="space-y-1 text-gray-600">
            <div><span className="font-medium">Version:</span> {versionInfo.version}</div>
            <div><span className="font-medium">Environment:</span> {versionInfo.environment}</div>
            <div><span className="font-medium">Build Date:</span> {new Date(versionInfo.buildDate).toLocaleDateString()}</div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <button
              onClick={() => setShowDetails(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}