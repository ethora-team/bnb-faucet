// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFaucetController {
    function drip(address wallet, address[] calldata tokens) external;
    function isOnCooldown(address wallet) external view returns (bool);
    function cooldownRemaining(address wallet) external view returns (uint256);
}
