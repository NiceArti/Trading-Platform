//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../utils/ReferralSystem.sol";

contract ReferalTest is ReferralSystem
{
    constructor() ReferralSystem(5){}
}