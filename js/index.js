/**
 * @file Home page functionality / entry point.
 * @author darragh0
 *
 * @requires jQuery
 */

/**
 * @typedef {Object} Web3
 */

/**
 * @typedef {Object} Wallet
 * @property {string} address - Wallet address
 * @property {string} privateKey - Wallet private key
 * @property {Object} keystoreData - Encrypted keystore data
 * @property {string} password - Password used to encrypt the wallet
 */

$(document).ready(() => {
  // When "Buy Ticket" button clicked
  $("#buy-ticket-btn").on("click", () => {
    window.location.href = "./html/buy.html";
  });
});
