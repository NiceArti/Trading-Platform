import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import {DEPLOYED_CONTRACT} from "./helpers"

task("remove-order", "Removes order of user who called it")
.setAction(async (hre) => 
{
    const contract = await hre.ethers.getContractAt("ACDMPlatform", DEPLOYED_CONTRACT);
    await contract.removeOrder();
});