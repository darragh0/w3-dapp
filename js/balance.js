/**
 * @file Handle wallet balance checking functionality for different user roles.
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
let currentRole = "attendee"; // Default role

$(document).ready(function () {
  // Initialize web3 connection first
  connectToRPC((web3Inst) => {
    ticketContract = initContract(web3Inst);
    console.log("Network and contract initialization complete");
  });

  // Role selection handler
  $('input[name="user-role"]').on("change", function () {
    currentRole = $(this).val();
    updateUIForRole(currentRole);
  });

  // Set default role to venue for now based on the screenshot
  currentRole = "venue";
  $('input[name="user-role"][value="venue"]').prop("checked", true);

  // Initialize with default role
  updateUIForRole(currentRole);

  // Distribution stats are always shown for venue role

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
        "Network connection not established yet. Please wait momentarily before trying again."
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
 * Also handles role-specific functionality based on the current role.
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

        // Handle role-specific functionality
        await handleRoleSpecificFeatures(address, ticketBalance);
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

            // Handle role-specific functionality
            await handleRoleSpecificFeatures(address, ticketBalance);
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
/**
 * Updates the UI based on the selected role
 *
 * @param {string} role - The selected role ('attendee', 'doorman', or 'venue')
 */
function updateUIForRole(role) {
  // Reset all role-specific elements
  $(".role-specific-options").hide();
  $("#ticket-validation").hide();
  $("#distribution-stats").hide();

  // Update UI based on role
  switch (role) {
    case "attendee":
      $("#lookup-icon").attr("class", "fas fa-search-dollar");
      $("#lookup-title").text("Lookup Wallet Balance");
      $("#wallet-input-label").text("Enter Your Wallet Address");
      $("#check-button-text").text("Check Balance");
      break;
    case "doorman":
      $("#lookup-icon").attr("class", "fas fa-clipboard-check");
      $("#lookup-title").text("Verify Attendee Ticket");
      $("#wallet-input-label").text("Enter Attendee's Wallet Address");
      $("#check-button-text").text("Verify Ticket");
      $("#doorman-options").show();
      break;
    case "venue":
      $("#lookup-icon").attr("class", "fas fa-chart-pie");
      $("#lookup-title").text("Check Ticket Distribution");
      $("#wallet-input-label").text("Enter Wallet Address to Check");
      $("#check-button-text").text("Check Distribution");
      break;
  }

  // Update the role options visual states
  $(".role-option").each(function () {
    const optionValue = $(this).find("input[type=radio]").val();
    if (optionValue === role) {
      $(this).addClass("selected");
    } else {
      $(this).removeClass("selected");
    }
  });
}
/**
 * Handles role-specific features based on the current selected role
 *
 * @param {string} address - The wallet address being checked
 * @param {number} ticketBalance - The ticket balance for the address
 */
async function handleRoleSpecificFeatures(address, ticketBalance) {
  switch (currentRole) {
    case "attendee":
      // Standard balance check, no additional features needed
      break;

    case "doorman":
      // Show ticket validation status
      $("#ticket-validation").show();
      const hasTicket = parseInt(ticketBalance) > 0;

      if (hasTicket) {
        $("#ticket-status")
          .text("VALID - This wallet holds a ticket")
          .removeClass("ticket-invalid")
          .addClass("ticket-valid");
      } else {
        $("#ticket-status")
          .text("INVALID - No tickets found")
          .removeClass("ticket-valid")
          .addClass("ticket-invalid");
      }
      break;

    case "venue":
      // Always show distribution statistics for venue role
      $("#distribution-stats").show();
      $("#distribution-loading").show();
      $("#distribution-data").hide();

      try {
        // Get total supply to calculate percentage
        const totalSupply = await ticketContract.methods.totalSupply().call();

        if (totalSupply > 0) {
          const percentage = ((ticketBalance / totalSupply) * 100).toFixed(2);
          $("#percentage-owned").text(`${percentage}%`);

          // Add additional distribution info
          let distributionInfo = "";
          if (percentage > 50) {
            distributionInfo = "Majority holder";
          } else if (percentage > 20) {
            distributionInfo = "Significant holder";
          } else if (percentage > 5) {
            distributionInfo = "Moderate holder";
          } else if (percentage > 0) {
            distributionInfo = "Minor holder";
          } else {
            distributionInfo = "No tickets held";
          }

          // Add distribution info to the display
          $("#distribution-data").append(
            `<p>Status: <span class="distribution-status">${distributionInfo}</span></p>`
          );

          // Add total supply info
          $("#distribution-data").append(
            `<p>Total tickets in circulation: <span class="total-supply">${totalSupply}</span></p>`
          );
        } else {
          $("#percentage-owned").text("0%");
          $("#distribution-data").append(
            `<p>No tickets have been issued yet.</p>`
          );
        }
      } catch (error) {
        console.error("Error fetching distribution data:", error);
        $("#distribution-data").html(
          `<p>Error fetching distribution data: ${error.message}</p>`
        );
      }

      $("#distribution-loading").hide();
      $("#distribution-data").show();
      break;
  }
}
