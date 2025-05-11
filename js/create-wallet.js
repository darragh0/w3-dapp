/**
 * Handle the creation of Ethereum wallets using `web3.js`.
 *
 * This module provides functions to generate a wallet, display its details,
 * and download the wallet keystore file.
 *
 * @module create-wallet
 */

// Init. global Web3 instance
const w3 = new Web3();

// Characters used for auto-gen'd pw
const PW_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?";

// Wallet details HTML template (added when wallet is generated)
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
 * @typedef {Object} Wallet
 *
 * @property {string} address - Wallet address
 * @property {string} privateKey - Wallet private key
 * @property {Object} keystoreData - Encrypted keystore data
 * @property {string} password - Password used to encrypt the wallet
 */

/**
 * Toggles password visibility in the `passwordInput` field.
 *
 * @param {jQuery} toggleVisBtn - Button element to toggle visibility
 * @param {jQuery} pwInput - Password input element
 */
function setToggleablePw(toggleVisBtn, pwInput) {
  if (pwInput.attr("type") === "password") {
    pwInput.attr("type", "text");
    toggleVisBtn.html('<i class="fas fa-eye-slash"></i>');
    toggleVisBtn.attr("title", "Hide Password");
  } else {
    pwInput.attr("type", "password");
    toggleVisBtn.html('<i class="fas fa-eye"></i>');
    toggleVisBtn.attr("title", "Show Password");
  }
}

/**
 * Copy text to clipboard & show a success animation.
 *
 * @param {jQuery} textEl - Element containing the text to copy
 * @param {jQuery} copyBtn - Button element to copy text
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
 * Generate a random secure password for the wallet.
 *
 * @param {number} len - Length of password to generate
 * @returns {string} - Randomly generated password
 */
function genPw(len = 64) {
  let pw = "";

  for (let i = 0; i < len; i++) {
    pw += PW_CHARS.charAt(Math.floor(Math.random() * PW_CHARS.length));
  }

  // Shuffle pw some more
  return pw
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}

/**
 * Generate a new Ethereum wallet.
 *
 * @param {string} pw - Password for keystore encryption
 * @returns {Wallet|null} - Web3 wallet object or null if error
 */
function genWallet(pw) {
  try {
    const wallet = w3.eth.accounts.create();
    const keystoreData = w3.eth.accounts.encrypt(wallet.privateKey, pw);

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
 * Download wallet details as a keystore file.
 *
 * @param {Wallet} wallet - Web3 wallet object
 */
function dlKeystore(wallet) {
  try {
    const keystoreData = wallet.keystoreData;
    const dataStr = JSON.stringify(keystoreData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = `${wallet.address}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Show a success message
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
 * Show success or error message in the given container.
 *
 * @param {boolean} isSuccess - Whether this is a success message
 * @param {string} msg - HTML content of the message
 * @param {number} dur - How long to display the message (in ms)
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
 * Show error message in the wallet form.
 *
 * @param {string} msg - HTML content of the error message
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
 * Render wallet details UI section.
 *
 * @param {Wallet} wallet - Web3 wallet to display
 */
function renderWalletDetails(wallet) {
  if (!wallet) {
    showWalletFormError(`
      <strong>Error:</strong> Failed to generate wallet.<br>
      <small>Please try again.</small>
    `);
    return;
  }

  const walletDetailsContainer = $("#wallet-details-container");

  // Add wallet details to page if not already there
  if (walletDetailsContainer.children().length === 0) {
    walletDetailsContainer.html(WALLET_DETAILS_TEMPLATE);
    initializeWalletDetailsUI(wallet);
  }

  // Update wallet address, password and private key display
  $("#wallet__addr__text").text(wallet.address);
  $("#wallet__password__text").text(wallet.password);
  $("#wallet__private__text").text(wallet.privateKey);

  // Apply the same styling to password display as private key display
  $("#wallet__password__display").addClass("private-key-display hidden-key");

  // Highlight the fields to draw attention
  $(".address-display")
    .addClass("highlight")
    .delay(1000)
    .queue(function () {
      $(this).removeClass("highlight").dequeue();
    });

  // Hide any error messages
  $("#wallet__addr__error").hide();

  // Scroll to the wallet details
  $("html, body").animate(
    {
      scrollTop: walletDetailsContainer.offset().top - 20,
    },
    500
  );
}

/**
 * Initialize event handlers for wallet details UI section.
 *
 * @param {Wallet} wallet - Web3 wallet object
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

  // Hide error container initially
  errorContainer.hide();

  // Add toggle functionality for private key visibility
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

  // Add toggle functionality for password visibility
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

  // Add event listeners for copy buttons
  copyBtn.on("click", function () {
    copyToClipboard($("#wallet__addr__text"), $(this));
  });

  copyPasswordBtn.on("click", function () {
    copyToClipboard($("#wallet__password__text"), $(this));
  });

  copyPrivateBtn.on("click", function () {
    copyToClipboard($("#wallet__private__text"), $(this));
  });

  // Add event listener for the download button
  downloadBtn.on("click", function () {
    dlKeystore(wallet);
  });
}

// Entry point on load
jQuery(() => {
  const pwInput = $("#wallet__password");
  const togglePwBtn = $("#toggle-password-btn");
  const genWalletBtn = $("#wallet__gen-btn");

  togglePwBtn.on("click", () => {
    setToggleablePw(togglePwBtn, pwInput);
  });

  genWalletBtn.on("click", () => {
    // Remove existing error msgs (if any)
    $("#wallet_error_message").remove();

    let password = pwInput.val().trim();
    let isAutoGenerated = false;

    // Gen pw if not provided
    if (!password) {
      password = genPw();
      isAutoGenerated = true;
      pwInput.val(password);
    }

    // Show "Generating..." w/ spinner on btn
    genWalletBtn.prop("disabled", true);
    genWalletBtn.html('<i class="fas fa-spinner fa-spin"></i> Generating...');

    // Gen wallet
    setTimeout(() => {
      const wallet = genWallet(password);
      renderWalletDetails(wallet);

      // If pw was auto-gen'd, tell user
      if (isAutoGenerated) {
        showMsg(
          true,
          `<p><strong>Note:</strong> A secure password was automatically generated for you.</p>`,
          5000
        );
      }

      // Reset btn
      genWalletBtn.prop("disabled", false);
      genWalletBtn.html('<i class="fas fa-key"></i> Generate Wallet');
    }, 500);
  });

  // Click "Generate Wallet" button on enter key (13)
  pwInput.on("keypress", function (e) {
    if (e.which === 13) {
      genWalletBtn.click();
      e.preventDefault();
    }
  });
});
