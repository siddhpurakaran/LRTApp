// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.5.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ImLRT is IERC20 {
    function mint(address to, uint256 amount) external;
}
