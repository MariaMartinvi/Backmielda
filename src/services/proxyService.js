/**
 * Service to handle CORS issues with Firebase Storage using an iframe proxy
 */

// Map to store pending requests
const pendingRequests = new Map();
let requestId = 0;
let proxyFrame = null;
let isProxyReady = false;

/**
 * Initialize the proxy iframe
 */
export const initProxy = () => {
  if (proxyFrame) {
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    // Create iframe
    proxyFrame = document.createElement('iframe');
    proxyFrame.style.display = 'none';
    proxyFrame.src = '/proxy.html';
    document.body.appendChild(proxyFrame);
    
    // Listen for messages from the iframe
    window.addEventListener('message', handleProxyMessage);
    
    // Wait for proxy to be ready
    const checkProxyReady = (event) => {
      if (event.data && event.data.type === 'proxyReady') {
        isProxyReady = true;
        window.removeEventListener('message', checkProxyReady);
        resolve();
      }
    };
    
    window.addEventListener('message', checkProxyReady);
  });
};

/**
 * Handle messages from the proxy iframe
 */
const handleProxyMessage = (event) => {
  if (event.data && event.data.type === 'fileContent') {
    const { requestId, content, error, success } = event.data;
    
    // Get the pending request
    const pendingRequest = pendingRequests.get(requestId);
    if (pendingRequest) {
      if (success) {
        pendingRequest.resolve(content);
      } else {
        pendingRequest.reject(new Error(error || 'Unknown error'));
      }
      
      // Remove the request from the map
      pendingRequests.delete(requestId);
    }
  }
};

/**
 * Fetch a file through the proxy
 * @param {string} url - URL of the file to fetch
 * @param {string} contentType - Type of content to fetch ('text' or 'blob')
 * @returns {Promise<string|Blob>} - The file content
 */
export const fetchThroughProxy = async (url, contentType = 'text') => {
  // Make sure proxy is initialized
  if (!proxyFrame || !isProxyReady) {
    await initProxy();
  }
  
  // Create a new request ID
  const currentRequestId = requestId++;
  
  // Create a promise that will be resolved when the proxy responds
  const promise = new Promise((resolve, reject) => {
    pendingRequests.set(currentRequestId, { resolve, reject });
  });
  
  // Send the request to the proxy
  proxyFrame.contentWindow.postMessage({
    type: 'fetchFile',
    url,
    contentType,
    requestId: currentRequestId
  }, '*');
  
  // Return the promise
  return promise;
};

/**
 * Clean up the proxy
 */
export const cleanupProxy = () => {
  if (proxyFrame) {
    window.removeEventListener('message', handleProxyMessage);
    document.body.removeChild(proxyFrame);
    proxyFrame = null;
    isProxyReady = false;
  }
}; 