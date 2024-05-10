// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.5.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Minimal interface for mLRT contract
 * @author Siddhpura Karan.
 */
interface ImLRT is IERC20 {
    /**
     * @notice The mint function will allow minter to mint amount of tokens into given account.
     * @param to The account in which tokens will be minted.
     * @param amount The amount is number of tokens account will get.
     */
    function mint(address to, uint256 amount) external;
}
