//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./IReferral.sol";

interface IReferral
{
    function REFERAL_LEVELS() external view returns(uint8);
    function referralsLength(address account,uint256 referalLevel) external view returns(uint256);
    function referralsOf(address account, uint256 referralLevel) external view returns(address[] memory);
    function referralExists(address referrer,address referral,uint256 level) external view returns(bool);
    function becomeReferral(address account) external;
    function removeReferral(address referral, uint256 referralLevel) external;
}
