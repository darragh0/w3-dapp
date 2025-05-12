/**
 * @file Handle sending tickets back to vendors.
 * @author darragh0
 *
 * @requires Web3
 * @requires jQuery
 * @requires network-utils
 * @requires contract.const
 */

import {
  web3,
  connectToRPC,
  updateNetworkStatus,
  currentRpcIndex,
} from "./network-utils.js";

import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  initContract,
} from "./contract.const.js";

// Global variables
let ticketContract;
let currentWallet = {
  address: null,
  privateKey: null,
  balance: 0,
  ticketBalance: 0,
};

// Vendor address is the contract address (returning tickets to vendor)
const VENDOR_ADDRESS = CONTRACT_ADDRESS;

/**
 * Initialize the contract
 * @param {Web3} web3Inst - Web3 instance to use
 */
function setupContract(web3Inst) {
  ticketContract = initContract(web3Inst);
  console.log("Contract initialized for send functionality");
}

$(document).ready(function () {
  // Initialize network connection
  connectToRPC((web3Inst) => {
    setupContract(web3Inst);
  });

  // Handle file selection
  $("#keystore-file").on("change", function () {
    const fileInput = this;
    const fileName = $(this).val().split("\\").pop();

    $("#wallet-error").hide();

    if (fileName) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const content = JSON.parse(e.target.result);
          // Verify it's a keystore file
          if (!content.version || !content.crypto || !content.id) {
            $("#wallet-error-text").text(
              "The selected file does not appear to be a valid Ethereum keystore file."
            );
            $("#wallet-error").show();
            return;
          }

          $("#file-name").text(fileName);
          $(".custom-file-upload").addClass("highlight");
          setTimeout(() => {
            $(".custom-file-upload").removeClass("highlight");
          }, 1000);
        } catch (error) {
          $("#wallet-error-text").text(
            "Invalid keystore file. Please select a valid JSON keystore file."
          );
          $("#wallet-error").show();
          console.error(error);
        }
      };

      reader.readAsText(file);
    } else {
      $("#file-name").text("Choose keystore file...");
    }
  });

  // Toggle password visibility
  $("#toggle-password-btn").on("click", function () {
    const passwordInput = $("#keystore-password");
    const icon = $(this).find("i");

    if (passwordInput.attr("type") === "password") {
      passwordInput.attr("type", "text");
      icon.removeClass("fa-eye").addClass("fa-eye-slash");
      $(this).attr("title", "Hide Password");
    } else {
      passwordInput.attr("type", "password");
      icon.removeClass("fa-eye-slash").addClass("fa-eye");
      $(this).attr("title", "Show Password");
    }
  });

  // Decrypt wallet button click handler
  $("#decrypt-wallet-btn").on("click", function () {
    $("#wallet-error").hide();

    const keystoreFile = $("#keystore-file")[0].files[0];
    const password = $("#keystore-password").val();

    if (!keystoreFile) {
      $("#wallet-error-text").text("Please select a keystore file.");
      $("#wallet-error").show();
      return;
    }

    if (!password) {
      $("#wallet-error-text").text("Please enter your wallet password.");
      $("#wallet-error").show();
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const keystoreJson = e.target.result;
        decryptWallet(keystoreJson, password);
      } catch (error) {
        $("#wallet-error-text").text(
          "Error reading keystore file. Please try again."
        );
        $("#wallet-error").show();
        console.error(error);
      }
    };
    reader.readAsText(keystoreFile);
  });

  // Tickets amount adjustment
  $("#decrease-tickets-btn").on("click", function () {
    let currentAmount = parseInt($("#ticket-amount").val());
    if (currentAmount > 1) {
      $("#ticket-amount").val(currentAmount - 1);
    }
  });

  $("#increase-tickets-btn").on("click", function () {
    let currentAmount = parseInt($("#ticket-amount").val());
    if (currentAmount < currentWallet.ticketBalance) {
      $("#ticket-amount").val(currentAmount + 1);
    }
  });

  // Validate manual ticket input
  $("#ticket-amount").on("input", function () {
    let value = parseInt($(this).val());

    if (isNaN(value) || value < 1) {
      $(this).val(1);
    } else if (value > currentWallet.ticketBalance) {
      $(this).val(currentWallet.ticketBalance);
    }
  });

  // Send tickets to vendor
  $("#send-tickets-btn").on("click", function () {
    const ticketAmount = parseInt($("#ticket-amount").val());

    if (isNaN(ticketAmount) || ticketAmount < 1) {
      alert("Please enter a valid number of tickets to send.");
      return;
    }

    if (ticketAmount > currentWallet.ticketBalance) {
      alert("You don't have enough tickets to send.");
      return;
    }

    prepareTransaction(ticketAmount);
  });

  // Copy transaction hash
  $("#copy-tx-hash").on("click", function () {
    const txHash = $("#transaction-hash").text();
    navigator.clipboard.writeText(txHash).then(() => {
      const originalIcon = $(this).find("i").attr("class");
      $(this).find("i").removeClass().addClass("fas fa-check");

      setTimeout(() => {
        $(this).find("i").removeClass().addClass(originalIcon);
      }, 1500);
    });
  });
});

/**
 * Decrypt wallet from keystore JSON
 *
 * @param {string} keystoreJson - Keystore JSON string
 * @param {string} password - Password for decryption
 */
function decryptWallet(keystoreJson, password) {
  try {
    web3.eth.accounts.wallet.clear();

    const decryptedAccount = web3.eth.accounts.decrypt(
      JSON.parse(keystoreJson),
      password
    );

    currentWallet.address = decryptedAccount.address;
    currentWallet.privateKey = decryptedAccount.privateKey;

    web3.eth.accounts.wallet.add(decryptedAccount);

    // Display the wallet address
    $("#wallet-address-text").text(
      `${currentWallet.address.substring(
        0,
        6
      )}...${currentWallet.address.substring(38)}`
    );

    // Show wallet info section
    $("#keystore-upload").hide();
    $("#wallet-info").show();

    // Fetch and display ticket balance
    fetchTicketBalance();
  } catch (error) {
    console.error("Wallet decryption error:", error);
    $("#wallet-error-text").text(
      "Invalid password or corrupted keystore file."
    );
    $("#wallet-error").show();
  }
}

/**
 * Fetch ticket balance for current wallet
 */
async function fetchTicketBalance() {
  try {
    if (!ticketContract || !currentWallet.address) {
      return;
    }

    const ticketBalance = await ticketContract.methods
      .balanceOf(currentWallet.address)
      .call();

    currentWallet.ticketBalance = parseInt(ticketBalance);
    $("#ticket-balance-text").text(`${currentWallet.ticketBalance} TTK`);

    // Update UI based on ticket balance
    if (currentWallet.ticketBalance > 0) {
      $("#send-form").show();
      $("#no-tickets-message").hide();

      // Set the maximum selectable ticket amount
      $("#ticket-amount").attr("max", currentWallet.ticketBalance);

      // If current value is more than available, reset to max
      const currentAmount = parseInt($("#ticket-amount").val());
      if (currentAmount > currentWallet.ticketBalance) {
        $("#ticket-amount").val(currentWallet.ticketBalance);
      }
    } else {
      $("#send-form").hide();
      $("#no-tickets-message").show();
    }
  } catch (error) {
    console.error("Error fetching ticket balance:", error);
    $("#ticket-balance-text").text("Error fetching balance");
  }
}

/**
 * Prepare transaction to send tickets to vendor
 *
 * @param {number} ticketAmount - Number of tickets to send
 */
function prepareTransaction(ticketAmount) {
  if (
    !web3 ||
    !ticketContract ||
    !currentWallet.address ||
    !currentWallet.privateKey
  ) {
    alert("Wallet not properly loaded. Please try again.");
    return;
  }

  // Update transaction summary
  $("#summary-from-address").text(
    `${currentWallet.address.substring(
      0,
      6
    )}...${currentWallet.address.substring(38)}`
  );
  $("#summary-to-address").text(
    `${VENDOR_ADDRESS.substring(0, 6)}...${VENDOR_ADDRESS.substring(38)}`
  );
  $("#summary-token-amount").text(`${ticketAmount} TTK`);

  // Show transaction summary
  $("#transaction-summary").show();
  $("#transaction-status").removeClass("success error").show();
  // Reset the transaction status with the spinner
  $("#transaction-status").html(
    '<i class="fas fa-spinner fa-spin"></i> <span id="status-message">Preparing transaction...</span>'
  );
  $("#transaction-result-container").hide();

  // Scroll to transaction summary
  document
    .getElementById("transaction-summary")
    .scrollIntoView({ behavior: "smooth" });

  // Execute the transaction
  setTimeout(() => {
    sendTokensToVendor(ticketAmount);
  }, 1000);
}

/**
 * Send tokens to the vendor address
 *
 * @param {number} amount - Number of tokens to send
 */
async function sendTokensToVendor(amount) {
  try {
    // Update the status message while keeping the spinner
    $("#status-message").text("Sending tokens to vendor...");

    // Prepare the contract method call
    const transferMethod = ticketContract.methods.transfer(
      VENDOR_ADDRESS,
      amount
    );

    // Estimate gas
    const gasEstimate = await transferMethod.estimateGas({
      from: currentWallet.address,
    });
    const gasPrice = await web3.eth.getGasPrice();

    // Get nonce
    const nonce = await web3.eth.getTransactionCount(currentWallet.address);

    // Create transaction object
    const txObject = {
      from: currentWallet.address,
      to: CONTRACT_ADDRESS,
      gas: Math.round(gasEstimate * 1.2), // Add 20% buffer
      gasPrice: gasPrice,
      nonce: nonce,
      data: transferMethod.encodeABI(),
    };

    // Sign and send transaction
    const signedTx = await web3.eth.accounts.signTransaction(
      txObject,
      currentWallet.privateKey
    );

    // Update the status message while keeping the spinner
    $("#status-message").text(
      "Transaction submitted. Waiting for confirmation..."
    );

    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    // Update UI based on transaction success
    $("#transaction-status").addClass("success");
    // Replace the spinner with a success icon when transaction completes
    $("#transaction-status").html(
      "<i class='fas fa-check-circle'></i> <span id='status-message'>Transaction successful!</span>"
    );

    // Display transaction hash
    $("#transaction-hash").text(receipt.transactionHash);

    // Update Etherscan link
    const etherscanUrl = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
    $("#etherscan-link").attr("href", etherscanUrl);

    // Show result container
    $("#transaction-result-container").show();

    // Refresh ticket balance
    fetchTicketBalance();
  } catch (error) {
    console.error("Error sending tokens:", error);
    $("#transaction-status").addClass("error");

    // Prepare error message
    let errorMessage = "";

    // Display specific error message if available
    if (error.message.includes("gas required exceeds allowance")) {
      errorMessage =
        "Transaction failed: Insufficient gas. Check your ETH balance.";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage =
        "Transaction failed: Insufficient funds for gas. Top up your ETH balance.";
    } else if (error.message.includes("execution reverted")) {
      errorMessage =
        "Transaction failed: Contract execution reverted. You may not have enough tokens.";
    } else {
      errorMessage = `Transaction failed: ${error.message.substring(
        0,
        100
      )}...`;
    }

    // Replace the spinner with an error icon and the error message
    $("#transaction-status").html(
      `<i class='fas fa-exclamation-circle'></i> <span id='status-message'>${errorMessage}</span>`
    );
  }
}
