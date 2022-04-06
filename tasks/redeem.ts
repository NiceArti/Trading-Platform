import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import {DEPLOYED_CONTRACT} from "./helpers"

task("redeem", "Make deposit for voting to dao")
.addParam("from", "account from user decides to buy")
.addParam("amount", "amount in ether to buy")
.setAction(async (taskArgs, hre) => 
{
    const contract = await hre.ethers.getContractAt("TheDAO", DEPLOYED_CONTRACT);
    await contract.redeem(taskArgs.from, {value: taskArgs.amount});
});