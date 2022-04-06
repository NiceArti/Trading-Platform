//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./utils/ReferralSystem.sol";


contract ACDMPlatform is ReferralSystem, Ownable, AccessControl, ReentrancyGuard
{
    using EnumerableSet for EnumerableSet.AddressSet;
    using Counters for Counters.Counter;
    using SafeERC20 for IERC20;

    enum RaundStatus {NOT_INITIALIZED, SALE, TRADE, ENDED}
    struct Raund 
    {
        uint256 tokenPrice;
        uint256 tokenAmount;
        uint256 switchTime;
        Counters.Counter raund;
        RaundStatus status;
    }

    struct UserData 
    {
        uint256 orderPrice;
        uint256 tokenAmount;
        bool registered;
    }

    bytes32 public constant OPERATOR = bytes32("OPERATOR");
    uint256 public constant THREE_DAYS = 259200; // 3 days in seconds
    uint256 public constant INCREASE_FACTOR = 0.0000034 ether;
    uint256 public userOwnership;
    address public immutable token;
    Raund public raund;
    mapping(address => UserData) public userData;
    
    event EtherTransfered(address from, uint256 amount);

    modifier onlyWhen(RaundStatus status)
    {
        _update();
        require(raund.status == status, "ACDMPlatform: status do not match");
        _;
    }

    constructor(
        uint256 startPrice,
        uint256 amount,
        address token_
    ) ReferralSystem(2)
    {
        raund.tokenPrice = startPrice;
        raund.tokenAmount = amount;
        token = token_;
        raund.status = RaundStatus.NOT_INITIALIZED;
        userOwnership = 0;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    receive() external payable
    {
        address referrer1 = _referrerOf(tx.origin);
        address referrer2 = _referrerOf(referrer1);

        if(referrer1 != address(0) && referrer2 != address(0)) {
            uint256 amount1 = msg.value * 5 / 100;
            uint256 amount2 = msg.value * 3 / 100;

            (bool success1, ) = payable(referrer1).call{value: amount1}("");
            require(success1 == true, "ACDMPlatform: Failed to send currency to referrer 1");

            (bool success2, ) = payable(referrer2).call{value: amount2}("");
            require(success2 == true, "ACDMPlatform: Failed to send currency to referrer 2");
        } else if(referrer1 != address(0)) {
            uint256 amount1 = msg.value * 5 / 100;
            (bool success, ) = payable(referrer1).call{value: amount1}("");
            require(success == true, "ACDMPlatform: Failed to send currency");
        }

        

        emit EtherTransfered(msg.sender, msg.value);
    }

    function register(address referrer) external
    {
        UserData storage data = userData[msg.sender];
        require(data.registered == false, "ACDMPlatform: already registered");
        data.registered = true;

        _update();
        if (referrer == address(0) || data.registered == false) return;

        _becomeReferral(referrer);
    }

    function buy()
        external
        payable
        onlyWhen(RaundStatus.SALE)
    {
        _buy(msg.sender, address(this), msg.value);
    }

    function addOrder(
        uint256 amount,
        uint256 price
    )
        external
        onlyWhen(RaundStatus.TRADE)
        nonReentrant
    {
        require(amount > 0, "ACDMPlatform: project has not been ended");
        require(price > 0, "ACDMPlatform: project has not been ended");
        UserData storage data = userData[msg.sender];

        data.orderPrice = price;
        data.tokenAmount = amount;

        userOwnership += amount;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    function removeOrder() external
    {
        UserData storage data = userData[msg.sender];
        require(data.tokenAmount > 0, "ACDMPlatform: add order before");
        _update();

        unchecked {userOwnership -= data.tokenAmount;}

        IERC20(token).safeTransfer(msg.sender, data.tokenAmount);

        delete data.tokenAmount;
        delete data.orderPrice;
    }

    function redeem(address account)
        external
        payable
        onlyWhen(RaundStatus.TRADE)
        nonReentrant
    {
        UserData storage data = userData[account];
        uint256 amount = msg.value;
        require(msg.sender != account, "ACDMPlatform: you cannot buy from yourself");
        unchecked { 
            data.tokenAmount -= amount;
            userOwnership -= data.tokenAmount;
        }
        _buy(msg.sender, account,amount);
    }

    function startSaleRound() 
        external 
        onlyRole(OPERATOR)
        onlyWhen(RaundStatus.NOT_INITIALIZED)
    {
        uint256 currentTime = block.timestamp;
        raund.switchTime = currentTime + THREE_DAYS;
        raund.status = RaundStatus.SALE;
        raund.raund.increment();
    }

    function startTradeRound() 
        external 
        onlyRole(OPERATOR)
        onlyWhen(RaundStatus.NOT_INITIALIZED)
    {
        uint256 currentTime = block.timestamp;
        raund.switchTime = currentTime + THREE_DAYS;
        raund.status = RaundStatus.TRADE;
        raund.raund.increment();
    }

    
    function deposit(uint256 amount) external onlyOwner
    {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    function claim() 
        external
        onlyOwner
    {
        require(raund.status == RaundStatus.ENDED, "ACDMPlatform: status do not match");
        uint256 contractBalance = IERC20(token).balanceOf(address(this));    

        unchecked {      
            contractBalance -= userOwnership;
        }

        if(userOwnership < contractBalance)
            IERC20(token).safeTransfer(msg.sender, contractBalance); 
    }

    function end() external onlyOwner
    {
        require(raund.raund.current() > 6, "ACDMPlatform: at least 6 rounds must pass");
        raund.status = RaundStatus.ENDED;
    }

    function terminatePlatform()
        external
        onlyOwner
    {
        require(raund.status == RaundStatus.ENDED, "ACDMPlatform: status do not match");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if(balance > 0) return;
        // delete contract from the network
        selfdestruct(payable(address(this)));
    }

    function _buy(address from, address to, uint256 amount) internal virtual
    {
        (bool success, ) = payable(to).call{value: amount}("");
        require(success == true, "ACDMPlatform: Failed to send currency");

        if(raund.status == RaundStatus.ENDED) return ;

        uint256 tokenAmount = (raund.status == RaundStatus.SALE)
            ? amount * raund.tokenPrice
            : amount * userData[to].orderPrice;

        IERC20(token).safeTransfer(from, tokenAmount);
    }

    function _update() internal virtual
    {
        uint256 currentTime = block.timestamp;  
        if(raund.switchTime > currentTime) return;
        
        if(raund.status == RaundStatus.SALE)
            raund.tokenPrice += INCREASE_FACTOR;

        raund.switchTime = currentTime;
        raund.status = RaundStatus.NOT_INITIALIZED;
    }
}
