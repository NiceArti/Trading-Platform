import { parseUnits } from "ethers/lib/utils";
import { BigNumber, constants, Signer } from "ethers";
import { ethers, waffle } from "hardhat";
import { ACDMPlatform, Token } from "../typechain";
import { Address } from "cluster";


export async function createToken()
{
    const Token = await ethers.getContractFactory("Token")
    let token: Token = await Token.deploy()
    await token.deployed()

    return token;
}


export async function create(price: BigNumber, amount: BigNumber, token: string) {
    const Contract = await ethers.getContractFactory("ACDMPlatform")
    let contract: ACDMPlatform = await Contract.deploy(price, amount, token)
    await contract.deployed()

    return contract;
}

export function secondsToDays(seconds: number)
{
    let currentTime = Date.now() / 1000
    let fixed: any = ((seconds - currentTime) / 86400).toFixed()
    return parseInt(fixed);
}

export async function skip(time: number, current: any = Date.now()) {
    current /= 1000
    current = parseInt(current)
    await ethers.provider.send("evm_increaseTime", [current += time]);
    await ethers.provider.send('evm_mine', [current += time]);
}

export async function etherBalanceOf(contract: string)
{
    const provider = waffle.provider;
    const balanceInWei = await provider.getBalance(contract);

    return balanceInWei;
}