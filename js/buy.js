/**
 * @file Handle ticket purchasing.
 * @author darragh0
 *
 * @requires Web3
 * @requires jQuery
 * @requires contract.const.js
 * @requires network-utils.js
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

let ticketContract;
let TICKET_PRICE;
let currentWallet = {
  address: null,
  privateKey: null,
  balance: 0,
  ticketBalance: 0,
};

/**
 * Initialize the contract and fetch the ticket price
 * @param {Web3} web3Inst - Web3 instance to use
 */
function setupContract(web3Inst) {
  ticketContract = initContract(web3Inst);

  if (ticketContract) {
    ticketContract.methods
      .ticketPrice()
      .call()
      .then((price) => {
        TICKET_PRICE = web3Inst.utils.fromWei(price, "ether");
        console.log(`Contract ticket price: ${TICKET_PRICE} ETH`);
        updateTotalCost();
      })
      .catch((error) => {
        console.error("Error fetching ticket price:", error);
      });
  }
}

$(document).ready(function () {
  // Add stylesheet if not already present
  if (!$('link[href="../css/buy.css"]').length) {
    $("<link>")
      .attr({
        rel: "stylesheet",
        href: "../css/buy.css",
      })
      .appendTo("head");
  }

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
    const pwInput = $("#keystore-password");
    const toggleBtn = $(this);

    if (pwInput.attr("type") === "password") {
      pwInput.attr("type", "text");
      toggleBtn.html('<i class="fas fa-eye-slash"></i>');
      toggleBtn.attr("title", "Hide Password");
    } else {
      pwInput.attr("type", "password");
      toggleBtn.html('<i class="fas fa-eye"></i>');
      toggleBtn.attr("title", "Show Password");
    }
  });

  $("#keystore-password").on("keypress", (e) => {
    if (e.which === 13) {
      $("#unlock-wallet-btn").click();
      e.preventDefault();
    }
  });

  // Handle wallet unlock
  $("#unlock-wallet-btn").on("click", function () {
    const keystoreFile = $("#keystore-file")[0].files[0];
    const password = $("#keystore-password").val();

    $("#wallet-error").hide();

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
        unlockWallet(keystoreJson, password);
      } catch (error) {
        $("#wallet-error-text").text(
          "Failed to process the wallet. Please check your file and try again."
        );
        $("#wallet-error").show();
        console.error(error);
      }
    };
    reader.onerror = function () {
      $("#wallet-error-text").text("Failed to read file. Please try again.");
      $("#wallet-error").show();
    };
    reader.readAsText(keystoreFile);
  });

  // Handle quantity changes
  $("#ticket-quantity").on("input", updateTotalCost);
  $("#increase-quantity").on("click", function () {
    const quantityInput = $("#ticket-quantity");
    const currentValue = parseInt(quantityInput.val()) || 0;
    if (currentValue < 10) {
      quantityInput.val(currentValue + 1);
      updateTotalCost();
    }
  });

  $("#decrease-quantity").on("click", function () {
    const quantityInput = $("#ticket-quantity");
    const currentValue = parseInt(quantityInput.val()) || 2;
    if (currentValue > 1) {
      quantityInput.val(currentValue - 1);
      updateTotalCost();
    }
  });
  // Buy ticket button handler
  $("#buy-ticket-btn").on("click", function () {
    const quantity = parseInt($("#ticket-quantity").val()) || 1;
    const totalCost = quantity * TICKET_PRICE;

    $("#purchase-error").hide();
    $("#purchase-loading").show();

    $("#buy-ticket-btn").prop("disabled", true).text("Processing...");

    if (totalCost > currentWallet.balance) {
      $("#purchase-error-text").text(
        "Insufficient balance to complete this purchase."
      );
      $("#purchase-error").show();
      $("#purchase-loading").hide();
      $("#buy-ticket-btn").prop("disabled", false).text("Buy Tickets");
      return;
    }

    purchaseTickets(quantity, totalCost);
  });

  // New purchase button handler
  $("#new-purchase-btn").on("click", function () {
    $("#purchase-success").hide();
    $("#purchase-form").show();
    $("#ticket-quantity").val(1);
    updateTotalCost();
  });
});

/**
 * Updates the total cost display based on quantity
 */
function updateTotalCost() {
  const quantity = parseInt($("#ticket-quantity").val()) || 1;
  const totalCost = quantity * TICKET_PRICE;
  $("#ticket-price").text(`${TICKET_PRICE} SETH`);
  $("#total-cost").text(`${totalCost.toFixed(6)} SETH`);
}

/**
 * Unlocks a wallet with keystore and password
 *
 * @param {string} keystoreJson - Keystore JSON data
 * @param {string} password - Wallet password
 */
function unlockWallet(keystoreJson, password) {
  try {
    try {
      const account = web3.eth.accounts.decrypt(keystoreJson, password);

      currentWallet = {
        address: account.address,
        privateKey: account.privateKey,
        balance: 0,
        ticketBalance: 0,
      };

      $("#wallet-address-text").text(account.address);
      $("#wallet-balance-text").text("Loading...");
      $("#ticket-balance-text").text("Loading...");
      $("#wallet-address-container").show();
      $("#wallet-ticket-container").show();

      fetchWalletBalance(account.address);

      $("#keystore-upload .card-header h2").text("Wallet Connected");
      $("#unlock-wallet-btn").prop("disabled", true).text("Wallet Unlocked");
      $("#purchase-form").show();

      updateTotalCost();
    } catch (decryptError) {
      $("#wallet-error-text").text("Invalid password. Please try again.");
      $("#wallet-error").show();
      console.error("Decryption error:", decryptError);
    }
  } catch (error) {
    $("#wallet-error-text").text(
      "Invalid keystore file. Please try again with a valid file."
    );
    $("#wallet-error").show();
    console.error("Keystore error:", error);
  }
}

/**
 * Fetches wallet balances from the blockchain
 *
 * @param {string} address - Wallet address
 */
async function fetchWalletBalance(address) {
  $("#wallet-balance-text").html('<span class="loading">Loading...</span>');
  $("#ticket-balance-text").html('<span class="loading">Loading...</span>');

  try {
    const weiBalance = await web3.eth.getBalance(address);

    // Convert and display balance
    const ethBalance = web3.utils.fromWei(weiBalance, "ether");
    currentWallet.balance = parseFloat(ethBalance);
    $("#wallet-balance-text").text(`${currentWallet.balance.toFixed(6)} SETH`);

    updateNetworkStatus("connected", "Connected to Sepolia");
  } catch (error) {
    console.error("Error fetching balance:", error);

    $("#wallet-balance-text").html(
      `<span class="error">Connection error</span> ` +
        `<button id="retry-balance" class="mini-button">Retry</button>`
    );
    $("#ticket-balance-text").html(
      `<span class="error">Connection error</span>`
    );

    // Add retry button handler
    $("#retry-balance").on("click", function () {
      connectToRPC((web3Inst) => {
        setupContract(web3Inst);
        fetchWalletBalance(address);
      }, currentRpcIndex + 1);
    });
  }

  try {
    // Fetch TTK balance
    if (ticketContract) {
      try {
        const ticketBalance = await ticketContract.methods
          .balanceOf(address)
          .call();

        currentWallet.ticketBalance = parseInt(ticketBalance);
        $("#ticket-balance-text").text(`${currentWallet.ticketBalance} TTK`);
      } catch (ticketError) {
        console.error("Error fetching ticket balance:", ticketError);
        $("#ticket-balance-text").html(
          `<span class="error">Error fetching TTK balance</span>`
        );

        ticketContract = initContract(web3);
      }
    } else {
      ticketContract = initContract(web3);

      try {
        const ticketBalance = await ticketContract.methods
          .balanceOf(address)
          .call();
        currentWallet.ticketBalance = parseInt(ticketBalance);
        $("#ticket-balance-text").text(`${currentWallet.ticketBalance} TTK`);
      } catch (retryError) {
        console.error("Error fetching ticket balance after retry:", retryError);
        $("#ticket-balance-text").html(
          `<span class="error">Error fetching TTK balance</span>`
        );
      }
    }
  } catch (error) {
    console.error("Error fetching balance:", error);

    $("#wallet-balance-text").html(
      `<span class="error">Error fetching balance</span> ` +
        `<button id="retry-balance" class="mini-button">Retry</button>`
    );
    $("#ticket-balance-text").html(
      `<span class="error">Error fetching TTK balance</span>`
    );

    // Add retry button handler
    $("#retry-balance").on("click", function () {
      tryFallbackRpcEndpoint(initContract).then(() => {
        fetchWalletBalance(address);
      });
    });
  }
}

/**
 * Purchases tickets using the TikkyTicket smart contract
 *
 * @param {number} quantity - Number of tickets to purchase
 * @param {number} totalCost - Total cost in ETH
 */
async function purchaseTickets(quantity, totalCost) {
  try {
    if (!ticketContract) {
      initContract();
      if (!ticketContract) {
        throw new Error("Contract not available. Please try again.");
      }
    }

    const ticketPriceWei = web3.utils.toWei(TICKET_PRICE.toString(), "ether");
    const totalCostWei = web3.utils.toWei(totalCost.toString(), "ether");

    const gasEstimate = await ticketContract.methods
      .buyTickets(quantity)
      .estimateGas({
        from: currentWallet.address,
        value: totalCostWei,
      })
      .catch((error) => {
        console.error("Gas estimation failed:", error);
        throw new Error(
          "Failed to estimate transaction gas. The transaction might fail."
        );
      });

    // Add 10% buffer to gas estimate
    const gasLimit = Math.floor(gasEstimate * 1.1);

    // Get current gas price
    const gasPrice = await web3.eth.getGasPrice();

    // Build transaction
    const txData = ticketContract.methods.buyTickets(quantity).encodeABI();
    const tx = {
      from: currentWallet.address,
      to: CONTRACT_ADDRESS,
      gas: gasLimit,
      gasPrice: gasPrice,
      data: txData,
      value: totalCostWei,
    };

    // Sign and send transaction
    const signedTx = await web3.eth.accounts.signTransaction(
      tx,
      currentWallet.privateKey
    );

    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    console.log("Transaction successful:", receipt);

    // Update UI with success information
    $("#success-quantity").text(quantity);
    $("#success-price").text(`${totalCost.toFixed(6)} SETH`);
    $("#success-tx").html(
      `Transaction hash: <a href="https://sepolia.etherscan.io/tx/${receipt.transactionHash}" target="_blank">${receipt.transactionHash}</a>`
    );

    // Update balances
    await fetchWalletBalance(currentWallet.address);

    // Show success message
    $("#purchase-form").hide();
    $("#purchase-loading").hide();
    $("#purchase-success").show();
  } catch (error) {
    console.error("Purchase failed:", error);

    $("#purchase-error-text").text(
      `Purchase failed: ${error.message || "Unknown error"}`
    );
    $("#purchase-error").show();
    $("#purchase-loading").hide();
    $("#buy-ticket-btn").prop("disabled", false).text("Buy Tickets");
  }
}

/**
 * Try to connect to a fallback RPC endpoint
 *
 * @param {Function} callback - Function to call if connection succeeds
 * @returns {Promise<boolean>} Whether a connection was established
 */
async function tryFallbackRpcEndpoint(callback) {
  return connectToRPC((web3Inst) => {
    if (callback && typeof callback === "function") {
      callback(web3Inst);
    }
  }, currentRpcIndex + 1);
}
