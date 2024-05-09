// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IDelegationManager} from "./externals/interfaces/IDelegationManager.sol";
import {IStrategyManager} from "./externals/interfaces/IStrategyManager.sol";
import {IStrategy} from "./externals/interfaces/IStrategy.sol";
import {ISignatureUtils} from "./externals/interfaces/ISignatureUtils.sol";
import {ImLRT} from "./interfaces/ImLRT.sol";

contract LRTMaster is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    //--------------------------------------------------------------------------------------
    //----------------------------------  ERRORS  -------------------------------------------
    //--------------------------------------------------------------------------------------
    error ZeroAddress();
    error ZeroAmount();
    error Paused();
    error InvalidAmount();

    //--------------------------------------------------------------------------------------
    //----------------------------------  VARIABLES  ---------------------------------------
    //--------------------------------------------------------------------------------------
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    address public stETH;
    ImLRT public ynLRT;
    IDelegationManager public delegationManager;
    IStrategyManager public strategyManager;
    IStrategy stETHStrategy;

    uint256 public totalstETHDeposited;
    bool public depositsPaused;

    //--------------------------------------------------------------------------------------
    //----------------------------------  EVENTS  ---------------------------------------
    //--------------------------------------------------------------------------------------
    event DepositPausedUpdated(bool isPaused);
    event Deposit(
        address indexed sender,
        address indexed receiver,
        uint256 assets,
        uint256 shares,
        uint256 totalDepositedInPool
    );

    //--------------------------------------------------------------------------------------
    //----------------------------------  CONSTRUCTOR  ---------------------------------------
    //--------------------------------------------------------------------------------------
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _stETH,
        address _ynLRT,
        address _admin,
        address _delegationManager,
        address _strategyManager,
        address _stETHStrategy
    ) external initializer {
        if (
            _stETH == address(0) ||
            _ynLRT == address(0) ||
            _admin == address(0) ||
            _delegationManager == address(0) ||
            _strategyManager == address(0) ||
            _stETHStrategy == address(0)
        ) {
            revert ZeroAddress();
        }

        __AccessControl_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, _admin);

        stETH = _stETH;
        ynLRT = ImLRT(_ynLRT);
        delegationManager = IDelegationManager(_delegationManager);
        strategyManager = IStrategyManager(_strategyManager);
        stETHStrategy = IStrategy(_stETHStrategy);
    }

    //--------------------------------------------------------------------------------------
    //----------------------------------  DEPOSITS   ---------------------------------------
    //--------------------------------------------------------------------------------------
    /**
     * @notice Allows depositing stETH into the contract in exchange for shares.
     * @dev Mints shares equivalent to the deposited stETH value and assigns them to the receiver.
     * @param receiver The address to receive the minted shares.
     * @return shares The amount of shares minted for the deposited ETH.
     */
    function deposit(
        address receiver,
        uint256 amount
    ) external nonReentrant returns (uint256 shares) {
        if (depositsPaused) {
            revert Paused();
        }

        if (amount == 0) {
            revert ZeroAmount();
        }

        IERC20(stETH).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(stETH).approve(address(strategyManager), amount);
        strategyManager.depositIntoStrategy(
            stETHStrategy,
            IERC20(stETH),
            amount
        );
        shares = previewDeposit(amount);

        ynLRT.mint(receiver, shares);

        totalstETHDeposited += amount;
        emit Deposit(msg.sender, receiver, amount, shares, totalstETHDeposited);
    }

    /// @notice Converts from ynETH to ETH using the current exchange rate.
    /// The exchange rate is given by the total supply of ynETH and total ETH controlled by the protocol.
    function _convertToShares(
        uint256 amount,
        Math.Rounding rounding
    ) internal view returns (uint256) {
        // 1:1 exchange rate on the first stake.
        // Use totalSupply to see if this is the boostrap call, not totalAssets
        if (ynLRT.totalSupply() == 0) {
            return amount;
        }

        // deltaynETH = (ynETHSupply / totalControlled) * amount
        return
            Math.mulDiv(amount, ynLRT.totalSupply(), totalAssets(), rounding);
    }

    /// @notice Calculates the amount of shares to be minted for a given deposit.
    /// @param amount The amount of assets to be deposited.
    /// @return The amount of shares to be minted.
    function previewDeposit(
        uint256 amount
    ) public view virtual returns (uint256) {
        return _convertToShares(amount, Math.Rounding.Floor);
    }

    /// @notice Calculates the total assets controlled by the protocol.
    /// @dev This includes both the stETH deposited in the pool awaiting processing and the ETH already sent to validators on the beacon chain.
    /// @return total The total amount of ETH in wei.
    function totalAssets() public view returns (uint256) {
        return stETHStrategy.userUnderlyingView(address(this));
    }

    //--------------------------------------------------------------------------------------
    //--------------------------------  ADMIN FUNCTIONS  --------------------------------------
    //--------------------------------------------------------------------------------------
    function updateDepositsPaused(bool isPaused) external onlyRole(ADMIN_ROLE) {
        depositsPaused = isPaused;
        emit DepositPausedUpdated(depositsPaused);
    }

    function delegate(address operator) external onlyRole(ADMIN_ROLE) {
        if (operator == address(0)) {
            revert ZeroAddress();
        }
        ISignatureUtils.SignatureWithExpiry memory signature;
        delegationManager.delegateTo(operator, signature, bytes32(0x0));
    }

    function undelegate() external onlyRole(ADMIN_ROLE) {
        delegationManager.undelegate(address(this));
    }

    function queueWithdrawal(uint256 share) external onlyRole(ADMIN_ROLE) {
        if (share > stETHStrategy.shares(address(this))) {
            revert InvalidAmount();
        }
        uint256[] memory shares = new uint256[](1);
        shares[0] = share;

        IStrategy[] memory strategies = new IStrategy[](1);
        strategies[0] = IStrategy(stETHStrategy);

        IDelegationManager.QueuedWithdrawalParams[]
            memory withdrawalParams = new IDelegationManager.QueuedWithdrawalParams[](
                1
            );
        withdrawalParams[0].withdrawer = address(this);
        withdrawalParams[0].shares = shares;
        withdrawalParams[0].strategies = strategies;
        delegationManager.queueWithdrawals(withdrawalParams);
    }

    function completeWithdrawal(
        uint256 share,
        uint32 blockNumber,
        bool receiveAsTokens,
        uint256 nonce
    ) external onlyRole(ADMIN_ROLE) {
        uint256[] memory shares = new uint256[](1);
        shares[0] = share;

        IStrategy[] memory strategies = new IStrategy[](1);
        strategies[0] = IStrategy(stETHStrategy);

        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(stETH);

        IDelegationManager.Withdrawal
            memory withdrawalParams = IDelegationManager.Withdrawal(
                address(this),
                address(0),
                address(this),
                nonce,
                blockNumber,
                strategies,
                shares
            );

        delegationManager.completeQueuedWithdrawal(
            withdrawalParams,
            tokens,
            0,
            receiveAsTokens
        );
    }

    function availableShareToWithdraw() public view returns (uint256) {
        return stETHStrategy.shares(address(this));
    }
}
