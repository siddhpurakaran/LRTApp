// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title mLRT
 * @author Siddhpura Karan.
 * @notice  This is the contract for LRT tokens in LRTApp. The main functionalities of this contract are
 * - enabling issuing of equivalent LRT tokens for deposits of stETH
 * - enabling burning of equivalent LRT tokens for withdrawal of stETH
 */
contract mLRT is ERC20, AccessControl {
    // Role value for minter
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    // Role value for burner
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    error ZeroAddress();

    /**
     * @notice Constructor for setting up mLRT token.
     * @param defaultAdmin The account which gets role of Admin.
     */
    constructor(address defaultAdmin) ERC20("mLRT", "mLRT") {
        if (defaultAdmin == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    /**
     * @notice The mint function will allow minter to mint amount of tokens into given account.
     * @param to The account in which tokens will be minted.
     * @param amount The amount is number of tokens account will get.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @notice The burn function will allow burner to burn amount of tokens from given account.
     * @param account The account from which tokens will be burned.
     * @param amount The amount is number of tokens that will be burned from account.
     */
    function burn(address account, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(account, amount);
    }
}
