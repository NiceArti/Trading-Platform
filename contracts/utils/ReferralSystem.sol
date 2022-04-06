//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./IReferral.sol";

abstract contract ReferralSystem is IReferral
{
    using EnumerableSet for EnumerableSet.AddressSet;

    uint8 public immutable override REFERAL_LEVELS;

    mapping(uint256 => mapping(address => EnumerableSet.AddressSet)) private _referrals;
    mapping(address => address) private _becameReferralOf;

    event ReferalAdded(address referal, address referer);


    constructor(uint8 referalLevel)
    {
        REFERAL_LEVELS = referalLevel;
    }


    function referralsLength(
        address account,
        uint256 referalLevel
    ) external view override returns(uint256)
    {
       return _referrals[referalLevel][account].length();
    }

    function referralsOf(
        address account,
        uint256 referralLevel
    ) external view override returns(address[] memory)
    {
        return _referrals[referralLevel][account].values();
    }


    function becomeReferral(address account) external override
    {
       _becomeReferral(account);
    }

    function removeReferral(
        address referral,
        uint256 referralLevel
    ) external override
    {
        _removeReferral(referral, referralLevel);
    }

    function referralExists(
        address referrer,
        address referral,
        uint256 level
    ) external view override returns(bool)
    {
        return _referrals[level][referrer].contains(referral);
    }


    function _referrerOf(address referral)
        internal
        virtual
        view
        returns(address)
    {
        return _becameReferralOf[referral];
    }


    function _becomeReferral(address account) internal virtual
    {
        _referrals[1][account].add(msg.sender);
        _becameReferralOf[msg.sender] = account;
        
        // check if your referer is not referal of others
        // if result is not zero address add referal
        // as subreferal to other referers
        if(_becameReferralOf[account] == address(0) || REFERAL_LEVELS < 2) 
            return;

        uint256 referalLevelStart = 2;
        address referer = _becameReferralOf[account];
        
        // loop untill reach last referal  
        for(uint256 i = 0; i < REFERAL_LEVELS; i++)
        {
            if(referer == address(0))
                return;

            // add referal in referer piramid
            _referrals[referalLevelStart][referer].add(msg.sender);
            referer = _becameReferralOf[referer];
            referalLevelStart++;
        }
    }


    function _removeReferral(
        address referral,
        uint256 referralLevel
    ) internal virtual
    {
        _referrals[referralLevel][msg.sender].remove(referral);
    }
}
