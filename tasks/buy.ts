import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import {DEPLOYED_CONTRACT} from "./helpers"

task("buy", "buy token with ether from contract")
.addParam("amount", "Amount of ether you send to buy tokens")
.setAction(async (taskArgs, hre) => 
{
    const contract = await hre.ethers.getContractAt("ACDMPlatform", DEPLOYED_CONTRACT);
    await contract.buy({value: taskArgs.amount});
});