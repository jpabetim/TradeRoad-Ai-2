
import React from 'react';

interface ApiKeyMessageProps {
  apiKeyPresent: boolean;
}

const ApiKeyMessage: React.FC<ApiKeyMessageProps> = ({ apiKeyPresent }) => {
  if (apiKeyPresent) {
    return null;
  }

  return (
    <div className="p-4 mb-4 text-sm text-yellow-300 bg-yellow-800 bg-opacity-30 rounded-lg border border-yellow-700" role="alert">
      <span className="font-medium">API Key Not Configured:</span> The Gemini API key (process.env.API_KEY) is not available. AI analysis features will be disabled. Please ensure the API key is correctly set up in your environment. This message is for developers.
    </div>
  );
};

export default ApiKeyMessage;
