// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TikkyTicket – A Web3 ticketing token
/// @author darragh0
/// @notice This contract lets users buy, hold, return, & transfer event tickets as ERC-20 tokens
contract TikkyTicket is ERC20, Ownable {
    /// @notice Price of one ticket
    uint256 public ticketPrice = 0.00001 ether;

    /// @notice Max number of tickets that can be sold
    uint256 public maxSupply;

    /// @notice Vendor or event organizer address
    address public vendor;

    /// @notice Deploys the contract with a ticket price and max supply
    /// @param _maxSupply Maximum number of tickets that can be minted
    constructor(
        uint256 _maxSupply
    ) ERC20("TikkyTicket", "TTK") Ownable(msg.sender) {
        maxSupply = _maxSupply;
        vendor = msg.sender;
    }

    /// @notice Purchase TikkyTicket(s) with ETH
    /// @param amount The number of tickets (tokens) to purchase
    /// @dev Mints tokens to the sender. Refunds excess ETH if overpaid.
    function buyTickets(uint256 amount) public payable {
        require(amount > 0, "Amount must be > 0");
        require(totalSupply() + amount <= maxSupply, "Not enough tickets left");
        require(msg.value >= ticketPrice * amount, "Not enough ETH sent");

        _mint(msg.sender, amount);

        uint256 refund = msg.value - (ticketPrice * amount);
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
    }

    /// @notice Withdraw accumulated ETH from ticket sales to the vendor's address
    /// @dev Only callable by the contract owner
    function withdraw() public onlyOwner {
        payable(vendor).transfer(address(this).balance);
    }

    /// @notice Update the ticket price
    /// @param newPrice New ticket price in Wei
    /// @dev Only callable by the contract owner
    function updateTicketPrice(uint256 newPrice) public onlyOwner {
        ticketPrice = newPrice;
    }

    /// @notice Allows users to send tickets back to the vendor
    /// @param amount No. of ticket tokens to return
    function returnTicket(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "Not enough TTK to return");
        _transfer(msg.sender, vendor, amount);
    }

    /// @notice Fallback function to accept ETH
    receive() external payable {}
}
