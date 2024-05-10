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

/**
 * @title LRTMaster
 * @author Siddhpura Karan.
 * @notice  This is the contract for managing restacking and/or delegations of LRT tokens. The main functionalities of this contract are
 * - enabling depositing of LRT tokens into eigen layer through this contract
 * - issuing receipt tokens for depositing stETH
 * - Allows admin to delgate tokens to any operator
 * - Allows admin to undelegate any previously delegated tokens
 * - Allowing admin to withdraw deposited stETH from tokens
 * - Allos admin to pause deposits of stETH
 */
contract LRTMaster is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
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
    // Role value for Admin
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Address of stETH token contract
    address public stETH;
    // mLRT token contract
    ImLRT public ynLRT;
    // DelegationManager contract of Eigenlayer
    IDelegationManager public delegationManager;
    // StrategyManager contract of Eigenlayer
    IStrategyManager public strategyManager;
    // Strategy contract for stETH
    IStrategy public stETHStrategy;

    // Total amount value of deposited stETH by users
    uint256 public totalstETHDeposited;
    // Flag for checking is deposits into contract is paused
    bool public depositsPaused;

    //--------------------------------------------------------------------------------------
    //----------------------------------  EVENTS  ---------------------------------------
    //--------------------------------------------------------------------------------------
    event Deposit(
        address indexed sender, address indexed receiver, uint256 assets, uint256 shares, uint256 totalDepositedInPool
    );
    event DepositPausedUpdated(bool isPaused);

    //--------------------------------------------------------------------------------------
    //----------------------------------  CONSTRUCTOR  ---------------------------------------
    //--------------------------------------------------------------------------------------
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializer function for setting up this contract including rols and eigenlayer contracts.
     * @param  _stETH stETH token contract address.
     * @param  _ynLRT mLRT token contract address.
     * @param  _admin Address of admin.
     * @param  _delegationManager address of DelegationManager.
     * @param  _strategyManager address of strategyManager.
     * @param  _stETHStrategy address of Strategy contract.
     */
    function initialize(
        address _stETH,
        address _ynLRT,
        address _admin,
        address _delegationManager,
        address _strategyManager,
        address _stETHStrategy
    ) external initializer {
        if (
            _stETH == address(0) || _ynLRT == address(0) || _admin == address(0) || _delegationManager == address(0)
                || _strategyManager == address(0) || _stETHStrategy == address(0)
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
     * @notice Allows depositing stETH into the contract in exchange for ynLRT Tokens.
     * @dev Mints amount of mLRT tokens equivalent to the deposited stETH value and assigns them to the receiver and deposits stETH to eigenlayer.
     * @param receiver The address to receive the minted mLRTs.
     * @return mintedMLRT The amount of mLRT minted for the deposited stETH.
     */
    function deposit(address receiver, uint256 amount) external notZeroAddress(receiver) nonReentrant returns (uint256 mintedMLRT) {
        if (depositsPaused) {
            revert Paused();
        }

        if (amount == 0) {
            revert ZeroAmount();
        }

        IERC20(stETH).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(stETH).approve(address(strategyManager), amount);
        strategyManager.depositIntoStrategy(stETHStrategy, IERC20(stETH), amount);
        mintedMLRT = previewDeposit(amount);

        ynLRT.mint(receiver, mintedMLRT);

        totalstETHDeposited += amount;
        emit Deposit(msg.sender, receiver, amount, mintedMLRT, totalstETHDeposited);
    }

    /// @notice Converts from stETH to ynETH using the current exchange rate.
    /// The exchange rate is given by the total supply of ynETH and total stETH controlled by the protocol.
    function _convertToShares(uint256 amount, Math.Rounding rounding) internal view returns (uint256) {
        // 1:1 exchange rate on the first stake.
        // Use totalSupply to see if this is the boostrap call, not totalAssets
        if (ynLRT.totalSupply() == 0) {
            return amount;
        }

        // deltaynETH = (ynLRTSupply / totalControlledStETH) * amount
        return Math.mulDiv(amount, ynLRT.totalSupply(), totalAssets(), rounding);
    }

    /// @notice Calculates the amount of MLRTs to be minted for a given deposit.
    /// @param amount The amount of stETH to be deposited.
    /// @return The amount of mLRTs to be minted.
    function previewDeposit(uint256 amount) public view virtual returns (uint256) {
        return _convertToShares(amount, Math.Rounding.Floor);
    }

    /// @notice Calculates the total assets controlled by the protocol.
    /// @dev This includes both the stETH deposited in the pool with it's incremented value.
    /// @return total The total amount of stETH in wei.
    function totalAssets() public view returns (uint256) {
        return stETHStrategy.userUnderlyingView(address(this));
    }

    //--------------------------------------------------------------------------------------
    //--------------------------------  ADMIN FUNCTIONS  --------------------------------------
    //--------------------------------------------------------------------------------------
    /// @notice Pause/Unpause stETH deposits into this contract.
    /// @dev This function allows pause/unpause deposits of stETH into contract.
    /// @dev This can only be called by user with ADMINROLE.
    function updateDepositsPaused(bool isPaused) external onlyRole(ADMIN_ROLE) {
        depositsPaused = isPaused;
        emit DepositPausedUpdated(depositsPaused);
    }

    /// @notice Delegates deposited shares to any given operator.
    /// @param operator The address of operator to which we want to delegate token shares.
    /// @dev This function allows admin to delegate shares of deposited amounts to any operator.
    /// @dev This can only be called by user with ADMINROLE.
    function delegate(address operator) external notZeroAddress(operator) onlyRole(ADMIN_ROLE) {
        ISignatureUtils.SignatureWithExpiry memory signature;
        delegationManager.delegateTo(operator, signature, bytes32(0x0));
    }

    /// @notice Undelegates deposited shares from operator.
    /// @dev This function allows admin to undelegate shares of deposited amounts from operator.
    /// @dev This can only be called by user with ADMINROLE.
    function undelegate() external onlyRole(ADMIN_ROLE) {
        delegationManager.undelegate(address(this));
    }

    /// @notice Initiates withdrawal of stETH.
    /// @param share The amount of shares we want to withdraw form eigenlayer.
    /// @dev This function initiates withdrawal of restacked stETH from eigenlayer contracts.
    /// @dev This can only be called by user with ADMINROLE.
    function queueWithdrawal(uint256 share) external onlyRole(ADMIN_ROLE) {
        if (share > stETHStrategy.shares(address(this))) {
            revert InvalidAmount();
        }
        uint256[] memory shares = new uint256[](1);
        shares[0] = share;

        IStrategy[] memory strategies = new IStrategy[](1);
        strategies[0] = IStrategy(stETHStrategy);

        IDelegationManager.QueuedWithdrawalParams[] memory withdrawalParams =
            new IDelegationManager.QueuedWithdrawalParams[](1);
        withdrawalParams[0].withdrawer = address(this);
        withdrawalParams[0].shares = shares;
        withdrawalParams[0].strategies = strategies;
        delegationManager.queueWithdrawals(withdrawalParams);
    }

    /// @notice Completes withdrawal of stETH.
    /// @param share The amount of shares we want to withdraw form eigenlayer.
    /// @param blockNumber The blockNumber in which withdrawal initiated.
    /// @param receiveAsTokens want to get withdrawal in stETH or shares.
    /// @param nonce nonce value which is used during queueWithdrawal.
    /// @dev This function completes withdrawal of restacked stETH from eigenlayer contracts.
    /// @dev This can only be called by user with ADMINROLE.
    function completeWithdrawal(uint256 share, uint32 blockNumber, bool receiveAsTokens, uint256 nonce)
        external
        onlyRole(ADMIN_ROLE)
    {
        uint256[] memory shares = new uint256[](1);
        shares[0] = share;

        IStrategy[] memory strategies = new IStrategy[](1);
        strategies[0] = IStrategy(stETHStrategy);

        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(stETH);

        IDelegationManager.Withdrawal memory withdrawalParams = IDelegationManager.Withdrawal(
            address(this), address(0), address(this), nonce, blockNumber, strategies, shares
        );

        delegationManager.completeQueuedWithdrawal(withdrawalParams, tokens, 0, receiveAsTokens);
    }

    /**
     * @notice convenience function for fetching the current total shares of `user` in this stETHstrategy
     */
    function availableShareToWithdraw() public view returns (uint256) {
        return stETHStrategy.shares(address(this));
    }

    //--------------------------------------------------------------------------------------
    //----------------------------------  MODIFIERS  ---------------------------------------
    //--------------------------------------------------------------------------------------

    /// @notice Ensure that the given address is not the zero address.
    /// @param _address The address to check.
    modifier notZeroAddress(address _address) {
        if (_address == address(0)) {
            revert ZeroAddress();
        }
        _;
    }
}
