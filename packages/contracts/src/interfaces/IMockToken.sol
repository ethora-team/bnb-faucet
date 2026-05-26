// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMockToken {
    function mint(address to, uint256 amount) external;
    function decimals() external view returns (uint8);
}
