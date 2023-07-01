import fs from 'fs'
import { expect } from 'chai'
import hre, { ethers } from 'hardhat'
import { loadFixture } from 'ethereum-waffle'
import { BigNumber, Contract, ContractReceipt, constants } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { arrayify, parseEther } from 'ethers/lib/utils'
import { impersonate } from './../helpers/impersonate'
import { deployInfinityWithLibraries } from '../helpers/deploy'
import { decodeBase64URI } from '../helpers/decode-uri'
import { VV } from '../helpers/constants'

const PRICE = parseEther('0.008')
const TOKEN = 88888888

export const deployContract = async () => {
  const { infinity: contract } = await deployInfinityWithLibraries(ethers)

  const [ owner, addr1, addr2, addr3, addr4, addr5 ] = await ethers.getSigners()
  const vv = await impersonate(VV, hre)

  return { contract, owner, addr1, addr2, addr3, addr4, addr5, vv }
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
      addr5: SignerWithAddress,
      vv: SignerWithAddress

  const deploy = async () => {
    ({ contract, owner, addr1, addr2, addr3, addr4, addr5, vv } = await loadFixture(deployContract))
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
      await expect(contract.connect(vv).generate(constants.AddressZero, addr1.address, TOKEN, 1, ''))
        .to.be.revertedWith(`Incorrect ether deposit.`)
    })

    it(`Should allow minting without a message`, async () => {
      // Pass AddressZero as source for gas efficiency
      await expect(contract.generate(constants.AddressZero, addr1.address, 123, 1, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        // TODO: Test parameters manually
    })

    it(`Should allow minting with a message`, async () => {
      await expect(contract.generate(constants.AddressZero, addr1.address, 123, 1, 'The beginning of infinity', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .to.emit(contract, 'Message')
        // TODO: Test parameters manually
    })

    it(`Should allow minting many of the same token`, async () => {
      let amount = 1

      // Generate an initial one
      await contract.connect(vv).generate(constants.AddressZero, addr1.address, 19, 1, '', { value: PRICE })

      while (amount < 512) {
        await expect(contract.generate(constants.AddressZero, addr1.address, 19, amount, '', { value: PRICE.mul(amount) }))
          .to.emit(contract, 'TransferSingle')
          // TODO: Test parameters manually

        amount *= 2
      }
    })

    it(`Should allow transferring assets`, async () => {
      const tx = await contract.connect(addr2).generate(constants.AddressZero, addr2.address, 888, 10, '', { value: PRICE.mul(10) })
      const logData = contract.interface.parseLog(getTransferLogs(contract, await tx.wait())[0])
      const ID = logData.args.id.toString()
      expect(ID.length).to.be.gt(7)
      expect(logData.args.from).to.equal(constants.AddressZero)
      expect(logData.args.to).to.equal(addr2.address)
      expect(logData.args.value).to.equal(10)

      expect(await contract.balanceOf(addr2.address, ID)).to.equal(10)

      await expect(contract.connect(addr2).safeTransferFrom(addr2.address, addr3.address, ID, 1, arrayify(0)))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr2.address, addr2.address, addr3.address, ID, 1)

      expect(await contract.balanceOf(addr2.address, ID)).to.equal(9)
      expect(await contract.balanceOf(addr3.address, ID)).to.equal(1)
    })

    it(`Shouldn't allow minting batches with an invalid deposit`, async () => {
      await expect(contract.generateMany(
        constants.AddressZero,
        [addr1.address, addr2.address],
        [2, 2],
        [10, 1],
        { value: PRICE.mul(1) }
      ))
        .to.be.revertedWith(`Incorrect ether deposit.`)
    })

    it(`Should allow minting and transferring batches`, async () => {
      const tx = await contract.generateMany(
        constants.AddressZero,
        [addr4.address, addr4.address, addr5.address],
        [1, 2, 2],
        [10, 10, 1],
        { value: PRICE.mul(21) }
      )
      const logData = getTransferLogs(contract, await tx.wait()).map(l => contract.interface.parseLog(l))
      expect(logData.length).to.equal(3)
      expect(logData[0].args.from).to.equal(constants.AddressZero)
      expect(logData[0].args.to).to.equal(addr4.address)
      expect(logData[0].args.value).to.equal(10)
      expect(logData[2].args.to).to.equal(addr5.address)
      const ID1 = logData[0].args.id
      const ID2 = logData[1].args.id

      await expect(contract.connect(addr4).safeBatchTransferFrom(
        addr4.address,
        addr5.address,
        [ID1, ID2],
        [5, 4],
        arrayify(0)
      ))
        .to.emit(contract, 'TransferBatch')
        .withArgs(addr4.address, addr4.address, addr5.address, [ID1, ID2], [5, 4])

      expect((await contract
        .connect(addr4.address)
        .balanceOfBatch(
          [addr4.address, addr4.address, addr5.address, addr5.address],
          [ID1, ID2, ID1, ID2]
        )).map((n: BigNumber) => n.toNumber())
      ).to.deep.equal([5, 6, 5, 5])
    })

    it(`Should allow minting by depositing ETH`, async () => {
      const tx = await owner.sendTransaction({ to: contract.address, value: PRICE })
      const receipt = await tx.wait()
      const logData = contract.interface.parseLog(getTransferLogs(contract, receipt)[0])
      expect(logData.args.id).to.be.gt(BigNumber.from(TOKEN))
      expect(logData.args.from).to.equal(constants.AddressZero)
      expect(logData.args.to).to.equal(owner.address)
    })

    it(`Should send surplus ETH back when minting by depositing ETH`, async () => {
      expect(await owner.sendTransaction({ to: contract.address, value: PRICE.add(parseEther('0.015')) }))
        .to.changeEtherBalance(owner, PRICE.mul(-2))
    })

    it(`Shouldn't allow people to create genesis tokens`, async () => {
      const tx = await contract.generate(constants.AddressZero, vv.address, 1, 1, '', { value: PRICE })
      const receipt = await tx.wait()
      const logData = contract.interface.parseLog(getTransferLogs(contract, receipt)[0])

      expect(logData.args.from).to.equal(constants.AddressZero)
      expect(logData.args.to).to.equal(vv.address)
      expect(logData.args.id).to.be.gt(BigNumber.from(TOKEN))
      expect(logData.args.value).to.equal(1)
    })

    it(`Should mark genesis tokens as minted when VV mints them`, async () => {
      await expect(contract.connect(vv).generate(constants.AddressZero, vv.address, 1, 1, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, constants.AddressZero, vv.address, 1, 1)

      await expect(contract.connect(vv).generate(constants.AddressZero, owner.address, 2, 1, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, constants.AddressZero, owner.address, 2, 1)

      await expect(contract.connect(vv).generateMany(
        constants.AddressZero,
        [owner.address, addr1.address, addr2.address, addr3.address],
        [1, 2, 3, 4],
        [1, 1, 1, 1],
        { value: PRICE.mul(4) }
      ))
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, constants.AddressZero, owner.address, 1, 1)
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, constants.AddressZero, addr1.address, 2, 1)
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, constants.AddressZero, addr2.address, 3, 1)
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, constants.AddressZero, addr3.address, 4, 1)

      // It should then allow others to mint these as well
      await expect(contract.connect(addr3).generate(owner.address, addr3.address, 1, 1, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr3.address, constants.AddressZero, addr3.address, 1, 1)

      await expect(contract.connect(addr3).generate(owner.address, addr3.address, 2, 1, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr3.address, constants.AddressZero, addr3.address, 2, 1)
    })

  })

  describe(`DeGenerating`, () => {

    it(`Should allow degenerating`, async () => {
      await contract.connect(vv).generate(constants.AddressZero, addr3.address, TOKEN, 10, '', { value: PRICE.mul(10) })
      const balance = await contract.balanceOf(addr3.address, TOKEN)

      await expect(contract.connect(addr3).degenerate(TOKEN, 1))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr3.address, addr3.address, constants.AddressZero, TOKEN, 1)

      expect(await contract.balanceOf(addr3.address, TOKEN)).to.equal(balance.sub(1))
    })

    it(`Should allow withdrawing funds with specified token amount`, async () => {
      await contract.connect(vv).generate(constants.AddressZero, addr2.address, TOKEN, 10, '', { value: PRICE.mul(10) })
      await expect(contract.connect(addr2).degenerate(TOKEN, 50)).to.be.revertedWith(`Can't burn more infinities than owned.`)

      expect(await contract.connect(addr2).degenerate(TOKEN, 5))
        .to.changeEtherBalance(addr2, PRICE.mul(5))
    })

    it(`Should allow withdrawing funds for many tokens`, async () => {
      await contract.connect(vv).generateMany(
        constants.AddressZero,
        [addr4.address, addr4.address, addr5.address, addr5.address],
        [TOKEN, TOKEN + 1, TOKEN, TOKEN + 1],
        [10, 10, 10, 10],
        { value: PRICE.mul(40) }
      )
      await expect(contract.connect(addr4).degenerateMany([TOKEN, TOKEN+1], [5, 5]))
        .to.emit(contract, 'TransferBatch')
        .withArgs(addr4.address, addr4.address, constants.AddressZero, [TOKEN, TOKEN+1], [5, 5])

      expect(await contract.connect(addr5).degenerateMany([TOKEN, TOKEN+1], [5, 5]))
        .to.changeEtherBalance(addr5, PRICE.mul(10))
    })

  })

  describe(`Rendering`, () => {
    it(`Renders token SVGs`, async () => {
      const svg = await contract.svg(88888889)

      fs.writeFileSync('test/dist/88888889.svg', svg)
    })

    it(`Renders token metadata`, async () => {
      const metadata = decodeBase64URI(await contract.uri(88888889))

      expect(metadata.attributes).to.deep.equal([
        { trait_type: 'Light', value: 'Off' },
        { trait_type: 'Grid', value: '8x8' },
      ])

      fs.writeFileSync('test/dist/88888889.json', JSON.stringify(metadata, null, 4))
    })
  })

})
