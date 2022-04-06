import { expect } from "chai"
import { parseEther, parseUnits } from "ethers/lib/utils"
import { ethers } from "hardhat"
import { BigNumber, BytesLike, constants, utils } from "ethers";
import * as helper from "./helpers"


describe("ACDMPlatform", function () {
  let owner: any, acc1: any, acc2: any
  let token: any
  let instance: any

  const FOUR_DAYS = 4 * 3600 * 24

  let timeskip: any = Date.now() / 1000
  timeskip = parseInt(timeskip)

  const TokenPrice: BigNumber = parseUnits("100000", 1)
  const TokenAmount: BigNumber = parseUnits("1000000")

  const THREE_DAYS = 259200;

  beforeEach(async () => 
  {
    // create accounts
    [owner, acc1, acc2] = await ethers.getSigners()
    
    // create token
    token = await helper.createToken()
    instance = await helper.create(TokenPrice, TokenAmount, token.address)
    
    let role = await instance.OPERATOR()
    await instance.grantRole(role, acc1.address)


    await token.approve(instance.address, TokenAmount)
    await instance.deposit("100000000000000000000000")
  })


  it("Raund: Should show initialized data", async () => 
  {
    let raund = await instance.raund() 

    await expect(raund.tokenPrice).to.eq(TokenPrice)
    await expect(raund.tokenAmount).to.eq(TokenAmount)
    await expect(raund.status).to.eq(0)
  })

  describe("register:", () => 
  {
    it("register: Should register without referar", async () => 
    {
      await instance.register(constants.AddressZero)
      let data = await instance.userData(owner.address)
      expect(data.registered).to.eq(true)
    })

    it("register: Should register with referar", async () => 
    {
      await instance.connect(acc1).register(constants.AddressZero)
      await instance.register(acc1.address)
      let data = await instance.userData(owner.address)
      expect(data.registered).to.eq(true)
    })

    it("register: Should fail if register twice", async () => 
    {
      await instance.register(acc1.address)
      expect(instance.register(acc1.address))
      .to.be.revertedWith("ACDMPlatform: already registered")
    })
  })

  describe("Sale Raund", () => 
  {
    it("buy: should fail if buy before sale raund starts", async () => 
    {
        expect(instance.buy({value: parseEther("0.000000000123")}))
        .to.be.revertedWith("ACDMPlatform: status do not match")
    })

    describe("When raund is sale", ()=> {
      it("buy: should buy tokens for ether", async () => 
      {
        await instance.connect(acc1).startSaleRound()

        let eth = await helper.etherBalanceOf(instance.address)
        expect(eth.toNumber()).to.eq(0)

        await instance.buy({value: parseEther("0.000000000123")})
        eth = await helper.etherBalanceOf(instance.address)
        let balance = await token.balanceOf(owner.address)
        let raund = await instance.raund()

        expect(eth.toNumber()).to.greaterThan(0)
        expect(balance).to.eq(eth.mul(TokenPrice))

        // raund should not change
        expect(raund.status).to.eq(1)
      })
    })

    describe("Send percentage to referrals", ()=> {
      it("buy: should buy tokens for ether", async () => 
      {
        await instance.register(constants.AddressZero)
        await instance.connect(acc1).register(owner.address)
        await instance.connect(acc2).register(acc1.address)
        await instance.connect(acc1).startSaleRound()

        let eth1Before = await helper.etherBalanceOf(owner.address)
        let eth2Before = await helper.etherBalanceOf(acc1.address)

        await instance.connect(acc2).buy({value: parseEther("0.000000000123")})
        
        let eth1After = await helper.etherBalanceOf(owner.address)
        let eth2After = await helper.etherBalanceOf(acc1.address)

        expect(eth1Before.add('3690000')).to.eq(eth1After)
        expect(eth2Before.add('6150000')).to.eq(eth2After)
      })
    })

  })


  describe("Trade Raund", () => 
  {
    it("addOrder, removeOrder, redeem: should fail if buy before sale raund starts", async () => 
    {
        expect(instance.addOrder({value: parseEther("0.000000000123")}))
        .to.be.revertedWith("ACDMPlatform: status do not match")

        expect(instance.removeOrder({value: parseEther("0.000000000123")}))
        .to.be.revertedWith("ACDMPlatform: status do not match")

        expect(instance.redeem({value: parseEther("0.000000000123")}))
        .to.be.revertedWith("ACDMPlatform: status do not match")
    })


    describe("When raund is trade", ()=> {
      const send = parseUnits("123", 1)
      beforeEach(async () => 
      {
        await instance.connect(acc1).startSaleRound()
        await instance.buy({value: send})
        await instance.connect(acc1).buy({value: send})
        await instance.connect(acc2).buy({value: send})

        await ethers.provider.send('evm_increaseTime', [timeskip += FOUR_DAYS]);
        await ethers.provider.send('evm_mine', [timeskip += FOUR_DAYS]);

        await instance.connect(acc1).startTradeRound()
      })

      it("addOrder: should set order", async () => 
      {
        await token.approve(instance.address, 1000)
        await instance.addOrder(1000, 2)
        let raund = await instance.raund()
        let data = await instance.userData(owner.address)

        expect(raund.status).to.eq(2)
        expect(data.orderPrice).to.eq(2)
        expect(data.tokenAmount).to.eq(1000)
      })

      it("removeOrder: should remove order", async () => 
      {
        await instance.register(constants.AddressZero)
        await token.approve(instance.address, 1000)
        await instance.addOrder(1000, 2)
        let data = await instance.userData(owner.address)

        // before removing
        expect(data.orderPrice).to.eq(2)
        expect(data.tokenAmount).to.eq(1000)

        await instance.removeOrder()
        data = await instance.userData(owner.address)

        expect(data.orderPrice).to.eq(0)
        expect(data.tokenAmount).to.eq(0)
        expect(data.registered).to.eq(true)
      })

      it("redeem: buy tokens from order", async () => 
      {
        await instance.register(constants.AddressZero)
        await token.approve(instance.address, 1000)
        await instance.addOrder(1000, 2)
        let data = await instance.userData(owner.address)

        expect(data.orderPrice).to.eq(2)
        expect(data.tokenAmount).to.eq(1000)

        let balanceBefore = await token.balanceOf(acc1.address)
        let ethBalanceBefore = await helper.etherBalanceOf(owner.address)

        await instance.connect(acc1).redeem(owner.address,{value: parseUnits("100", 0)})
        data = await instance.userData(owner.address)
        let balanceAfter = await token.balanceOf(acc1.address)
        let ethBalanceAfter = await helper.etherBalanceOf(owner.address)

        expect(balanceAfter).to.eq(balanceBefore.add(200))
        expect(ethBalanceAfter).to.eq(ethBalanceBefore.add(100))
      })
    })

  })

  describe("Admin functionality", () => 
  {
    it("claim, end: should fail", async () => 
    {
      expect(instance.claim())
      .to.be.revertedWith("ACDMPlatform: status do not match")

      expect(instance.end())
      .to.be.revertedWith("ACDMPlatform: status do not match")
    })

    it("claim, end: should send all tokens and ether to admin", async () => 
    {
      for(let i = 0; i < 7; i++){
        await instance.connect(acc1).startSaleRound()
        await ethers.provider.send('evm_increaseTime', [timeskip += FOUR_DAYS]);
        await ethers.provider.send('evm_mine', [timeskip += FOUR_DAYS]);
        await instance.connect(acc1).startTradeRound()
        await ethers.provider.send('evm_increaseTime', [timeskip += FOUR_DAYS]);
        await ethers.provider.send('evm_mine', [timeskip += FOUR_DAYS]);
      }

      await instance.end()
      let status = await instance.raund()
      expect(status.status).to.be.eq(3)

      await instance.claim()
      let balance:BigNumber = await token.balanceOf(owner.address)
      expect(balance.toBigInt).to.eq(parseUnits("1000000").toBigInt)
    })


    it("terminatePlatform: should delete platform and send all eth to owner", async () => 
    {
      for(let i = 0; i < 7; i++){
        await instance.connect(acc1).startSaleRound()
        await ethers.provider.send('evm_increaseTime', [timeskip += FOUR_DAYS]);
        await ethers.provider.send('evm_mine', [timeskip += FOUR_DAYS]);
        await instance.connect(acc1).startTradeRound()
        await ethers.provider.send('evm_increaseTime', [timeskip += FOUR_DAYS]);
        await ethers.provider.send('evm_mine', [timeskip += FOUR_DAYS]);
      }
      await instance.connect(acc1).startSaleRound()
      await instance.buy({value: parseEther("0.00000000001")})

      await instance.end()
      await instance.claim()
      await instance.terminatePlatform()

      expect(await helper.etherBalanceOf(instance.address)).to.eq(0)
    })


  })
})