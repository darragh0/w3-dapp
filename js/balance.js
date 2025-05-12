/**
 * @file Handle wallet balance checking functionality.
 * @author darragh0
 *
 * @requires Web3
 * @requires jQuery
 * @requires network-utils
 * @requires contract.const
 */

import { web3, connectToRPC, currentRpcIndex } from "./network-utils.js";
import { initContract } from "./contract.const.js";

let ticketContract = null;

$(document).ready(function () {
  // Initialize web3 connection first
  connectToRPC((web3Inst) => {
    ticketContract = initContract(web3Inst);
    console.log("Network and contract initialization complete");
  });

  $("#wallet-address-input").on("keypress", (e) => {
    if (e.which === 13) {
      e.preventDefault();
      $("#check-balance-btn").click();
    }
  });

  $("#check-balance-btn").on("click", function () {
    const address = $("#wallet-address-input").val().trim();

    $("#balance-results").hide();
    $("#balance-error").hide();

    if (!web3) {
      $("#balance-error-text").text(
        "Network connection not established yet. Please try again."
      );
      $("#balance-error").show();
      return;
    }

    if (!address || !web3.utils.isAddress(address)) {
      $("#balance-error-text").text("Please enter a valid Ethereum address.");
      $("#balance-error").show();
      return;
    }

    $("#balance-loading").show();
    fetchBalances(address);
  });
});

/**
 * Fetches ETH and TTK balances for a given address.
 *
 * @param {string} address - Wallet address to check
 * @param {number} retryCount - Number of times the function has been retried (default: 0)
 */
async function fetchBalances(address, retryCount = 0) {
  // Maximum number of retries to prevent infinite loops
  const MAX_RETRIES = 2;

  try {
    if (!web3) {
      throw new Error("No web3 connection available");
    }

    $("#display-address-text").text(address);

    const ethBalance = await web3.eth.getBalance(address);
    const ethInEther = web3.utils.fromWei(ethBalance, "ether");
    $("#eth-balance").text(`${parseFloat(ethInEther).toFixed(6)} SETH`);

    if (ticketContract) {
      try {
        const ticketBalance = await ticketContract.methods
          .balanceOf(address)
          .call();
        $("#ttk-balance").text(`${ticketBalance} TTK`);
      } catch (ticketError) {
        console.error("Error fetching ticket balance:", ticketError);
        $("#ttk-balance").text("Contract not available");

        // Try to reinitialize the contract once
        if (web3) {
          ticketContract = initContract(web3);
          try {
            const ticketBalance = await ticketContract.methods
              .balanceOf(address)
              .call();
            $("#ttk-balance").text(`${ticketBalance} TTK`);
          } catch (retryError) {
            console.error("Error on retry:", retryError);
            $("#ttk-balance").text("Contract not available");
          }
        }
      }
    } else {
      $("#ttk-balance").text("Contract not available");
      if (web3) {
        ticketContract = initContract(web3);
      }
    }

    $("#balance-loading").hide();
    $("#balance-results").show();
  } catch (error) {
    console.error("Error fetching balances:", error);

    $("#balance-loading").hide();

    // Limit retries to prevent infinite loops
    if (retryCount < MAX_RETRIES) {
      $("#balance-error-text").text(
        `Connection error. Trying again... (${retryCount + 1}/${MAX_RETRIES})`
      );
      $("#balance-error").show();

      // Try the next RPC endpoint
      connectToRPC((web3Inst) => {
        ticketContract = initContract(web3Inst);
        setTimeout(() => fetchBalances(address, retryCount + 1), 1000);
      }, currentRpcIndex + 1).then((success) => {
        if (!success) {
          $("#balance-loading").hide();
          $("#balance-error-text").text(
            "Failed to connect to network. Please try again later."
          );
          $("#balance-error").show();
        }
      });
    } else {
      $("#balance-error-text").text(
        "Failed to fetch balances after multiple attempts. Please try again later."
      );
      $("#balance-error").show();
    }
  }
}
