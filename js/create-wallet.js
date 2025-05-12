/**
 * @file Ethereum wallet creation and management.
 * @author darragh0
 *
 * @requires Web3
 * @requires jQuery
 * @requires network-utils
 */

import { web3, connectToRPC } from "./network-utils.js";

// Chars for password gen
const PW_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?";

// Wallet details HTML template (inserted on wallet gen)
const WALLET_DETAILS_TEMPLATE = `
  <div id="wallet__addr" class="card">
    <div class="card-header">
      <i class="fas fa-address-card"></i>
      <h2>Wallet Details</h2>
    </div>
    <div class="card-content">
      <div class="address-title">Wallet Address</div>
      <div class="input-group">
        <div id="wallet__addr__display" class="address-display">
          <span id="wallet__addr__text"></span>
          <button id="copy-btn" class="icon-btn" title="Copy Address">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>

      <div class="private-key-section">
        <div class="address-title">Wallet Password <small>(Keep this safe!)</small></div>
        <div class="input-group">
          <div id="wallet__password__display" class="address-display private-key-display hidden-key">
            <span id="wallet__password__text"></span>
            <button id="toggle-password-display-btn" class="icon-btn" title="Show Password">
              <i class="fas fa-eye"></i>
            </button>
            <button id="copy-password-btn" class="icon-btn" title="Copy Password">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="private-key-section">
        <div class="address-title">Private Key <small>(Keep this secret!)</small></div>
        <div class="input-group">
          <div id="wallet__private__display" class="address-display private-key-display hidden-key">
            <span id="wallet__private__text"></span>
            <button id="toggle-private-key-btn" class="icon-btn" title="Show Private Key">
              <i class="fas fa-eye"></i>
            </button>
            <button id="copy-private-btn" class="icon-btn" title="Copy Private Key">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
      </div>
      
      <div class="button-container">
        <button id="download-btn" class="action-btn">
          <i class="fas fa-download"></i> Download Keystore
        </button>
      </div>
      
      <div id="keystore-message-container"></div>

      <div id="wallet__addr__error">
        <p id="wallet__addr__error__text">Please enter a valid password.</p>
      </div>
    </div>
  </div>
`;

/**
 * Toggle password visibility.
 *
 * @param {jQuery} toggleBtn - Toggle button element
 * @param {jQuery} pwInput - Password input element
 */
function setToggleablePw(toggleBtn, pwInput) {
  if (pwInput.attr("type") === "password") {
    pwInput.attr("type", "text");
    toggleBtn.html('<i class="fas fa-eye-slash"></i>');
    toggleBtn.attr("title", "Hide Password");
  } else {
    pwInput.attr("type", "password");
    toggleBtn.html('<i class="fas fa-eye"></i>');
    toggleBtn.attr("title", "Show Password");
  }
}

/**
 * Copy text to clipboard (w/ success animation).
 *
 * @param {jQuery} textEl - Element with text to copy
 * @param {jQuery} copyBtn - Button that triggers copy
 */
function copyToClipboard(textEl, copyBtn) {
  const text = textEl.text();
  if (text && text !== "") {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        copyBtn.addClass("copied");
        const originalIcon = copyBtn.html();
        copyBtn.html('<i class="fas fa-check"></i>');
        setTimeout(() => {
          copyBtn.html(originalIcon);
          copyBtn.removeClass("copied");
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
      });
  }
}

/**
 * Generate random secure password.
 *
 * @param {number} len - Length of password
 * @returns {string} Generated password
 */
function genPw(len = 64) {
  let pw = "";
  for (let i = 0; i < len; i++) {
    pw += PW_CHARS.charAt(Math.floor(Math.random() * PW_CHARS.length));
  }

  return pw
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}

/**
 * Generate new Ethereum wallet.
 *
 * @param {string} pw - Password for keystore encryption
 * @returns {Wallet|null} Wallet object or null on error
 */
function genWallet(pw) {
  try {
    if (!web3) {
      console.error("Error generating wallet: Web3 not available");
      return null;
    }

    const wallet = web3.eth.accounts.create();
    const keystoreData = web3.eth.accounts.encrypt(wallet.privateKey, pw);

    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      keystoreData: keystoreData,
      password: pw,
    };
  } catch (error) {
    console.error("Error generating wallet:", error);
    return null;
  }
}

/**
 * Download wallet as keystore file.
 *
 * @param {Wallet} wallet - Wallet object
 */
function dlKeystore(wallet) {
  try {
    const dataStr = JSON.stringify(wallet.keystoreData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = `${wallet.address}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    showMsg(
      true,
      `
      <p>Keystore file downloaded successfully!</p>
      <p><small>Keep your password safe! It is required to unlock your keystore file.</small></p>
    `,
      5000
    );
  } catch (error) {
    console.error("Error creating keystore:", error);
    showMsg(false, `Error creating keystore file: ${error.message}`, 3000);
  }
}

/**
 * Show message in UI.
 *
 * @param {boolean} isSuccess - Whether this is a success message
 * @param {string} msg - HTML content of the message
 * @param {number} dur - Display duration in ms
 */
function showMsg(isSuccess, msg, dur) {
  const messageClass = isSuccess ? "success-message" : "error-message";
  const messageEl = $(`<div class="${messageClass}">${msg}</div>`);

  $("#keystore-message-container").empty().append(messageEl);

  messageEl
    .fadeIn(300)
    .delay(dur)
    .fadeOut(300, function () {
      $(this).remove();
    });
}

/**
 * Show error message in wallet form.
 *
 * @param {string} msg - Error message HTML
 */
function showWalletFormError(msg) {
  $("#wallet_error_message").remove();

  $("#wallet__form .card-content").append(`
    <div id="wallet_error_message" class="error-message" style="display:block; margin-top: 0.8rem;">
      ${msg}
    </div>
  `);

  setTimeout(() => {
    $("#wallet_error_message").fadeOut(300, function () {
      $(this).remove();
    });
  }, 5000);
}

/**
 * Render wallet details in UI.
 *
 * @param {Wallet} wallet - Wallet to display
 */
function renderWalletDetails(wallet) {
  if (!wallet) {
    showWalletFormError(`
      <strong>Error:</strong> Failed to generate wallet.<br>
      <small>Please ensure you're connected to the network and try again.</small>
    `);
    return;
  }

  const walletDetailsContainer = $("#wallet-details-container");

  if (walletDetailsContainer.children().length === 0) {
    walletDetailsContainer.html(WALLET_DETAILS_TEMPLATE);
    initializeWalletDetailsUI(wallet);
  }

  $("#wallet__addr__text").text(wallet.address);
  $("#wallet__password__text").text(wallet.password);
  $("#wallet__private__text").text(wallet.privateKey);

  $("#wallet__password__display").addClass("private-key-display hidden-key");

  $(".address-display")
    .addClass("highlight")
    .delay(1000)
    .queue(function () {
      $(this).removeClass("highlight").dequeue();
    });

  $("#wallet__addr__error").hide();

  $("html, body").animate(
    {
      scrollTop: walletDetailsContainer.offset().top - 20,
    },
    500
  );
}

/**
 * Initialize event handlers for wallet details UI.
 *
 * @param {Wallet} wallet - Wallet object
 */
function initializeWalletDetailsUI(wallet) {
  const togglePrivateKeyBtn = $("#toggle-private-key-btn");
  const togglePasswordDisplayBtn = $("#toggle-password-display-btn");
  const copyBtn = $("#copy-btn");
  const copyPasswordBtn = $("#copy-password-btn");
  const copyPrivateBtn = $("#copy-private-btn");
  const downloadBtn = $("#download-btn");
  const privateKeyDisplay = $("#wallet__private__display");
  const passwordDisplay = $("#wallet__password__display");
  const errorContainer = $("#wallet__addr__error");

  errorContainer.hide();

  togglePrivateKeyBtn.on("click", function () {
    privateKeyDisplay.toggleClass("hidden-key");

    if (privateKeyDisplay.hasClass("hidden-key")) {
      $(this).html('<i class="fas fa-eye"></i>');
      $(this).attr("title", "Show Private Key");
    } else {
      $(this).html('<i class="fas fa-eye-slash"></i>');
      $(this).attr("title", "Hide Private Key");
    }
  });

  togglePasswordDisplayBtn.on("click", function () {
    passwordDisplay.toggleClass("hidden-key");

    if (passwordDisplay.hasClass("hidden-key")) {
      $(this).html('<i class="fas fa-eye"></i>');
      $(this).attr("title", "Show Password");
    } else {
      $(this).html('<i class="fas fa-eye-slash"></i>');
      $(this).attr("title", "Hide Password");
    }
  });

  copyBtn.on("click", function () {
    copyToClipboard($("#wallet__addr__text"), $(this));
  });

  copyPasswordBtn.on("click", function () {
    copyToClipboard($("#wallet__password__text"), $(this));
  });

  copyPrivateBtn.on("click", function () {
    copyToClipboard($("#wallet__private__text"), $(this));
  });

  downloadBtn.on("click", function () {
    dlKeystore(wallet);
  });
}

jQuery(() => {
  const pwInput = $("#wallet__password");
  const togglePwBtn = $("#toggle-password-btn");
  const genWalletBtn = $("#wallet__gen-btn");

  // Init Web3 connection
  connectToRPC(() => {
    console.log("Web3 initialized for wallet creation");
  });

  togglePwBtn.on("click", () => {
    setToggleablePw(togglePwBtn, pwInput);
  });

  genWalletBtn.on("click", () => {
    $("#wallet_error_message").remove();

    // Check if web3 is available first
    if (!web3) {
      showWalletFormError(`
        <strong>Error:</strong> Network connection not established yet. Please wait momentarily before trying again.
      `);
      return;
    }

    let password = pwInput.val().trim();
    let isAutoGenerated = false;

    if (!password) {
      password = genPw();
      isAutoGenerated = true;
      pwInput.val(password);
    }

    genWalletBtn.prop("disabled", true);
    genWalletBtn.html('<i class="fas fa-spinner fa-spin"></i> Generating...');

    setTimeout(() => {
      const wallet = genWallet(password);
      renderWalletDetails(wallet);

      if (isAutoGenerated) {
        showMsg(
          true,
          `<p><strong>Note:</strong> A secure password was automatically generated for you.</p>`,
          5000
        );
      }

      genWalletBtn.prop("disabled", false);
      genWalletBtn.html('<i class="fas fa-key"></i> Generate Wallet');
    }, 500);
  });

  // Submit form on `Enter` (13) key
  pwInput.on("keypress", (e) => {
    if (e.which === 13) {
      genWalletBtn.click();
      e.preventDefault();
    }
  });
});
