# Tikky – A Web3 DApp

[![WEB3JS](https://img.shields.io/badge/web3.js-blue?logo=web3dotjs&logoColor=blue&labelColor=white)](https://web3js.readthedocs.io/en/v1.10.0)
[![ETHEREUM](https://img.shields.io/badge/Ethereum-gray?logo=ethereum&logoColor=black&labelColor=white)](https://en.wikipedia.org/wiki/Ethereum)

<p align="center">
    <img width=800 alt="Home Page Screenshot" src="./images/docs/png/home-page.png" /><br /><br />
    A Web3 Distributed Application (DApp) that implements a simple ticketing system.
</p>

## Running the App
If you are using [VSCode](https://code.visualstudio.com), install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension (if you don't have it), clone and open this repository in VSCode, and simply click on the <code style="color: Cyan">"Go Live"</code> button at the bottom right of the UI.

If you are not using VSCode or do not wish to use the Live Server plugin, you can use [Node.js](https://nodejs.org/en). Simply run `npm install && npm run serve`.

Either method should start a local server that you can open in your browser (typically at [localhost:5500](http://localhost:5500)).<br />

## Contract Information
The Solidity smart contract for this application (`0x20756e089701c7DAE04aa5895213F6FDAE644030`) can be found [here](https://sepolia.etherscan.io/address/0x20756e089701c7DAE04aa5895213F6FDAE644030). I have included a copy of the Solidity file in this repository: [`TikkyToken.sol`](./TikkyToken.sol).

> [!WARNING]
> This application relies on CDNs to fetch dependencies (`web3.js` & `jQuery`) and may fail if the sources are offline.

> [!CAUTION]
> This project is for testing/demo purposes only, so please **do not** upload keystore files that contain access to real funds.
