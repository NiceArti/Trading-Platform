import { expect } from "chai"
import { parseUnits } from "ethers/lib/utils"
import { ethers } from "hardhat"
import { BytesLike, constants, utils } from "ethers";
import * as helper from "./helpers"
import { ReferralSystem } from "../typechain";


describe("ReferralSystem", function () {
  let owner: any, acc1: any, acc2: any, acc3: any, acc5: any, acc6: any, acc7: any
  let instance: ReferralSystem

  beforeEach(async () => 
  {
    // create accounts
    [owner, acc1, acc2, acc3, acc5, acc6, acc7] = await ethers.getSigners()

    const Referal = await ethers.getContractFactory("ReferalTest")
    instance = await Referal.deploy()
    await instance.deployed()
  });


  describe("becomeReferral", () => 
  {
    it("becomeReferral: Should add referal to referar", async () => 
    {
        await instance.connect(acc1).becomeReferral(owner.address)
        await instance.connect(acc2).becomeReferral(owner.address)
        await instance.connect(acc3).becomeReferral(owner.address)

        expect(await instance.referralExists(owner.address, acc1.address, 1)).to.eq(true)
        expect(await instance.referralExists(owner.address, acc2.address, 1)).to.eq(true)
        expect(await instance.referralExists(owner.address, acc3.address, 1)).to.eq(true)
    })

    it("becomeReferral: Should add referal to referar in layer higher level", async () => 
    {
        await instance.connect(acc1).becomeReferral(owner.address)
        await instance.connect(acc5).becomeReferral(owner.address)
        await instance.connect(acc2).becomeReferral(acc1.address)
        await instance.connect(acc6).becomeReferral(acc1.address)
        await instance.connect(acc3).becomeReferral(acc2.address)
        await instance.connect(acc7).becomeReferral(acc2.address)

        expect(await instance.referralExists(owner.address, acc1.address, 1)).to.eq(true)
        expect(await instance.referralExists(owner.address, acc2.address, 2)).to.eq(true)
        expect(await instance.referralExists(owner.address, acc3.address, 3)).to.eq(true)

        expect(await instance.referralExists(owner.address, acc1.address, 1)).to.eq(true)
        expect(await instance.referralExists(owner.address, acc2.address, 1)).to.eq(false)
        expect(await instance.referralExists(owner.address, acc3.address, 1)).to.eq(false)

        console.log(await instance.referralsOf(owner.address, 1))
        console.log(await instance.referralsOf(owner.address, 2))
        console.log(await instance.referralsOf(owner.address, 3))
    })
  })

  describe("removeReferral", () => 
  {
    beforeEach(async () => 
    {
        await instance.connect(acc1).becomeReferral(owner.address)
        await instance.connect(acc5).becomeReferral(owner.address)
        await instance.connect(acc2).becomeReferral(acc1.address)
        await instance.connect(acc6).becomeReferral(acc1.address)
        await instance.connect(acc3).becomeReferral(acc2.address)
        await instance.connect(acc7).becomeReferral(acc2.address)
    });

    it("removeReferral: Should remove referal to referar", async () => 
    {
        await instance.removeReferral(acc1.address, 1)
        await instance.removeReferral(acc5.address, 1)
        await instance.removeReferral(acc2.address, 2)
        await instance.removeReferral(acc7.address, 3)

        expect(await instance.referralExists(owner.address, acc1.address, 1)).to.eq(false)
        expect(await instance.referralExists(owner.address, acc2.address, 1)).to.eq(false)
        expect(await instance.referralExists(owner.address, acc5.address, 2)).to.eq(false)
        expect(await instance.referralExists(owner.address, acc7.address, 3)).to.eq(false)
    })

    it("removeReferral: Referrals can be removed only on their level", async () => 
    {
        await instance.removeReferral(acc1.address, 2)
        await instance.removeReferral(acc5.address, 4)
        await instance.removeReferral(acc2.address, 3)
        await instance.removeReferral(acc7.address, 2)

        expect(await instance.referralExists(owner.address, acc1.address, 1)).to.eq(true)
        expect(await instance.referralExists(owner.address, acc5.address, 1)).to.eq(true)
        expect(await instance.referralExists(owner.address, acc2.address, 2)).to.eq(true)
        expect(await instance.referralExists(owner.address, acc7.address, 3)).to.eq(true)
    })
  })

  describe("referralsLength", () => 
  {
    beforeEach(async () => 
    {
        await instance.connect(acc1).becomeReferral(owner.address)
        await instance.connect(acc5).becomeReferral(owner.address)
        await instance.connect(acc2).becomeReferral(acc1.address)
        await instance.connect(acc6).becomeReferral(acc1.address)
        await instance.connect(acc3).becomeReferral(acc2.address)
        await instance.connect(acc7).becomeReferral(acc2.address)
    });

    it("referralsLength: Should remove referal to referar", async () => 
    {
        let len1 = await instance.referralsLength(owner.address, 1)
        let len2 = await instance.referralsLength(owner.address, 2)
        let len3 = await instance.referralsLength(owner.address, 3)

        expect(len1).to.eq(2)
        expect(len2).to.eq(2)
        expect(len3).to.eq(2)
    })
  })
})