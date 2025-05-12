/**
 * @file Handle sending tickets to vendors.
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
  initializeContract,
} from "./contract.const.js";

let ticketContract;

$(document).ready(function () {
  // Initialize web3 connection first
  connectToRPC((web3Inst) => {
    ticketContract = initializeContract(web3Inst);
    console.log("Network and contract initialization complete for send page");
  });

  // TODO: Implement send functionality
});
