import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

async function main() {

  //0x5159C677c4e1485Bef5d42058Bdb6620145B3DDA
  const ACDMPlatform = await ethers.getContractFactory("ACDMPlatform");
  const platform = await ACDMPlatform.deploy(
    1000,
    parseUnits("10000"),
    "0x882d9CF6BdF3e036A526F3888682cCd538975BeF"
  );

  await platform.deployed();

  console.log("Contract deployed to:", platform.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
