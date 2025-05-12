/**
 * @file Common network utilities for RPC connection management.
 * @module network-utils
 * @author darragh0
 *
 * @requires Web3
 * @requires jQuery
 */

// RPC endpoints for Sepolia network
const RPC_ENDPOINTS = [
  "https://rpc2.sepolia.org",
  "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  "https://ethereum-sepolia.publicnode.com",
];

let web3 = null; // Set later
let currentRpcIndex = 0;

/**
 * Connect to first operational RPC endpoint.
 *
 * @param {Function} onConnect - Callback when connection established
 * @param {number} startIndex - Index to start trying from
 * @returns {Promise<boolean>} Success indicator
 */
async function connectToRPC(onConnect, startIndex = 0) {
  updateNetworkStatus("connecting", "Connecting to network...");

  // Reset idx if out of bounds
  startIndex = startIndex % RPC_ENDPOINTS.length;

  for (let i = startIndex; i < RPC_ENDPOINTS.length; i++) {
    try {
      const tempWeb3 = new Web3(RPC_ENDPOINTS[i]);

      // Set timeout to prevent hanging
      await Promise.race([
        tempWeb3.eth.net.getId(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        ),
      ]);

      web3 = tempWeb3;
      currentRpcIndex = i;

      updateNetworkStatus(
        "connected",
        `Connected to Sepolia (${shortenRpcUrl(RPC_ENDPOINTS[i])})`
      );
      console.log(`Connected to: ${shortenRpcUrl(RPC_ENDPOINTS[i])}`);

      if (onConnect && typeof onConnect === "function") {
        onConnect(web3);
      }

      return true;
    } catch (error) {
      console.log(
        `Failed to connect to ${shortenRpcUrl(RPC_ENDPOINTS[i])}: ${
          error.message
        }`
      );
    }
  }

  // If no endpoints worked
  updateNetworkStatus("error", "Cannot connect to network");
  console.error("Failed to connect to any RPC endpoint");
  return false;
}

/**
 * Shorten RPC URL for display.
 *
 * @param {string} url - RPC URL to shorten
 * @returns {string} Shortened URL
 */
function shortenRpcUrl(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

/**
 * Update UI network status indicator.
 *
 * @param {string} status - Connection status ("connecting", "connected", or "error")
 * @param {string} message - Status message
 */
function updateNetworkStatus(status, message) {
  const statusDot = $(".status-dot");
  const statusText = $(".status-text");

  if (statusDot.length && statusText.length) {
    statusDot.removeClass("connecting connected error").addClass(status);
    statusText.text(message);
  }
}

export {
  web3,
  connectToRPC,
  updateNetworkStatus,
  currentRpcIndex,
  shortenRpcUrl,
};
