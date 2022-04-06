import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import {DEPLOYED_CONTRACT} from "./helpers"

task("add-order", "Makes order with tokens setting price in ether")
.addParam("amount", "Amount of tokens to order")
.addParam("price", "Token price")
.setAction(async (taskArgs, hre) => 
{
    const contract = await hre.ethers.getContractAt("ACDMPlatform", DEPLOYED_CONTRACT);
    await contract.addOrder(taskArgs.amount, taskArgs.price);
});