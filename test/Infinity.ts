import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from 'ethereum-waffle'
import { BigNumber, Contract, ContractReceipt, constants } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { arrayify, parseEther } from 'ethers/lib/utils'

const PRICE = parseEther('0.008')
const TOKEN = 88888888

export const deployContract = async () => {
  const Infinity = await ethers.getContractFactory('Infinity')
  const contract = await Infinity.deploy()

  await contract.deployed()

  const [ owner, addr1, addr2, addr3, addr4, addr5 ] = await ethers.getSigners()

  return { contract, owner, addr1, addr2, addr3, addr4, addr5 }
}

// Helper function to get Transfer event logs from the transaction receipt
const getTransferLogs = (contract: Contract, receipt: ContractReceipt) => {
  const transferEvent = contract.interface.getEvent('TransferSingle')
  const transferEventSignature = contract.interface.getSighash(transferEvent)
  return receipt.logs.filter((log) => log.topics[0].startsWith(transferEventSignature))
}

describe('Infinity', () => {
  let contract: Contract,
      owner: SignerWithAddress,
      addr1: SignerWithAddress,
      addr2: SignerWithAddress,
      addr3: SignerWithAddress,
      addr4: SignerWithAddress,
      addr5: SignerWithAddress

  const deploy = async () => {
    ({ contract, owner, addr1, addr2, addr3, addr4, addr5 } = await loadFixture(deployContract))
  }

  beforeEach(async () => {
    await deploy()
  })

  it(`Should deploy the contract correctly`, async () => {
    expect(await contract.name()).to.equal('Infinity')
    expect(await contract.symbol()).to.equal('∞')
  })

  it(`Should set the right price`, async () => {
    expect(await contract.price()).to.equal(PRICE)
  })

  it(`Should set the correct metadata URI`, async () => {
    expect(await contract.uri(1)).to.equal('https://metadata.infinity.checks.art/{id}.json')
  })

  describe(`Generating`, () => {

    it(`Shouldn't allow minting for free`, async () => {
      await expect(contract.generate(addr1.address, TOKEN, 1, ''))
        .to.be.revertedWith(`Incorrect ether deposit.`)
    })

    it(`Should allow minting without a message`, async () => {
      await expect(contract.generate(addr1.address, TOKEN, 1, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(owner.address, constants.AddressZero, addr1.address, TOKEN, 1)
    })

    it(`Should allow minting with a message`, async () => {
      await expect(contract.generate(addr1.address, TOKEN, 1, 'The beginning of infinity', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(owner.address, constants.AddressZero, addr1.address, TOKEN, 1)
        .to.emit(contract, 'Message')
        .withArgs(owner.address, addr1.address, TOKEN, 'The beginning of infinity')
    })

    it(`Should allow minting many of the same token`, async () => {
      let amount = 1

      while (amount < 512) {
        await expect(contract.generate(addr1.address, TOKEN, amount, '', { value: PRICE.mul(amount) }))
          .to.emit(contract, 'TransferSingle')
          .withArgs(owner.address, constants.AddressZero, addr1.address, TOKEN, amount)

        amount *= 2
      }
    })

    it(`Should allow transferring assets`, async () => {
      await expect(contract.connect(addr2).generate(addr2.address, TOKEN, 10, '', { value: PRICE.mul(10) }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr2.address, constants.AddressZero, addr2.address, TOKEN, 10)

      expect(await contract.balanceOf(addr2.address, TOKEN)).to.equal(10)

      await expect(contract.connect(addr2).safeTransferFrom(addr2.address, addr3.address, TOKEN, 1, arrayify(0)))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr2.address, addr2.address, addr3.address, TOKEN, 1)

      expect(await contract.balanceOf(addr2.address, TOKEN)).to.equal(9)
      expect(await contract.balanceOf(addr3.address, TOKEN)).to.equal(1)
    })

    it(`Shouldn't allow minting batches with an invalid deposit`, async () => {
      await expect(contract.generateMany([addr1.address, addr2.address], [2, 2], [10, 1], { value: PRICE.mul(1) }))
        .to.be.revertedWith(`Incorrect ether deposit.`)
    })

    it(`Should allow minting and transferring batches`, async () => {
      await expect(
        contract.generateMany(
          [addr4.address, addr4.address, addr5.address],
          [TOKEN, TOKEN+1, TOKEN+1], [10, 10, 1],
          { value: PRICE.mul(21) }
        )
      )
        .to.emit(contract, 'TransferSingle')
        .withArgs(owner.address, constants.AddressZero, addr4.address, TOKEN, 10)
        .to.emit(contract, 'TransferSingle')
        .withArgs(owner.address, constants.AddressZero, addr4.address, TOKEN+1, 10)
        .to.emit(contract, 'TransferSingle')
        .withArgs(owner.address, constants.AddressZero, addr5.address, TOKEN+1, 1)

      await expect(contract.connect(addr4).safeBatchTransferFrom(
        addr4.address,
        addr5.address,
        [TOKEN, TOKEN+1],
        [5, 4],
        arrayify(0)
      ))
        .to.emit(contract, 'TransferBatch')
        .withArgs(addr4.address, addr4.address, addr5.address, [TOKEN, TOKEN+1], [5, 4])

      expect((await contract
        .connect(addr4.address)
        .balanceOfBatch(
          [addr4.address, addr4.address, addr5.address, addr5.address],
          [TOKEN, TOKEN+1, TOKEN, TOKEN+1]
        )).map((n: BigNumber) => n.toNumber())
      ).to.deep.equal([5, 6, 5, 5])
    })

    it(`Should allow minting by depositing ETH`, async () => {
      const tx = await owner.sendTransaction({ to: contract.address, value: PRICE })
      const receipt = await tx.wait()
      const logData = contract.interface.parseLog(getTransferLogs(contract, receipt)[0])
      expect(logData.args.id.toString().length).to.be.gt(7)
      expect(logData.args.from).to.equal(constants.AddressZero)
      expect(logData.args.to).to.equal(owner.address)
    })

    it(`Should send surplus ETH back when minting by depositing ETH`, async () => {
      expect(await owner.sendTransaction({ to: contract.address, value: PRICE.add(parseEther('0.015')) }))
        .to.changeEtherBalance(owner, PRICE.mul(-2))
    })

  })

  describe(`DeGenerating`, () => {

    it(`Should allow degenerating`, async () => {
      const balance = await contract.balanceOf(addr2.address, TOKEN)
      await expect(contract.connect(addr2).degenerate(TOKEN, 1))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr2.address, addr2.address, constants.AddressZero, TOKEN, 1)

      expect(await contract.balanceOf(addr2.address, TOKEN)).to.equal(balance.sub(1))
    })

    it(`Should allow withdrawing funds with specified token amount`, async () => {
      await expect(contract.connect(addr2).degenerate(TOKEN, 50)).to.be.revertedWith(`Can't burn more infinities than owned.`)

      expect(await contract.connect(addr2).degenerate(TOKEN, 5))
        .to.changeEtherBalance(addr2, PRICE.mul(5))
    })

    it(`Should allow withdrawing funds for many tokens`, async () => {
      await expect(contract.connect(addr4).degenerateMany([TOKEN, TOKEN+1], [5, 5]))
        .to.emit(contract, 'TransferBatch')
        .withArgs(addr4.address, addr4.address, constants.AddressZero, [TOKEN, TOKEN+1], [5, 5])

      expect(await contract.connect(addr5).degenerateMany([TOKEN, TOKEN+1], [5, 5]))
        .to.changeEtherBalance(addr5, PRICE.mul(10))
    })

  })

})
