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
import { render } from '../helpers/render-pngs'

const PRICE = parseEther('0.008')

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

  describe(`Generating`, () => {

    it(`Shouldn't allow minting for free`, async () => {
      await expect(contract.connect(vv).generate(constants.AddressZero, addr1.address, ''))
        .to.be.reverted
    })

    it(`Should allow minting without a message`, async () => {
      // Pass AddressZero as source for gas efficiency
      await expect(contract.generate(addr1.address, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        // TODO: Test parameters manually
    })

    it(`Should allow minting with a message`, async () => {
      await expect(contract.generate(addr1.address, 'The beginning of infinity', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .to.emit(contract, 'Message')
        // TODO: Test parameters manually
    })

    it(`Should allow minting many of the same token`, async () => {
      let amount = 1

      // Generate an initial one
      await contract.connect(vv).generate(addr1.address, '', { value: PRICE })

      while (amount < 512) {
        await expect(contract.generate(addr1.address, '', { value: PRICE.mul(amount) }))
          .to.emit(contract, 'TransferSingle')
          // TODO: Test parameters manually

        amount *= 2
      }
    })

    it(`Should allow minting many different tokens`, async () => {
      const tx = await contract.connect(addr1).generateMany(
        [addr1.address, addr1.address],
        [9, 19],
        { value: PRICE.mul(9 + 19) }
      )
      const logs = getTransferLogs(contract, await tx.wait())
      const log1Data = contract.interface.parseLog(logs[0])
      const log2Data = contract.interface.parseLog(logs[1])
      expect(log1Data.args.from).to.equal(constants.AddressZero)
      expect(log2Data.args.from).to.equal(constants.AddressZero)
      expect(log1Data.args.to).to.equal(addr1.address)
      expect(log2Data.args.to).to.equal(addr1.address)
      expect(log1Data.args.id).not.to.equal(log2Data.args.id)
      expect(log1Data.args.value).to.equal(9)
      expect(log2Data.args.value).to.equal(19)
    })

    it(`Should allow transferring assets`, async () => {
      const tx = await contract.connect(addr2).generate(addr2.address, '', { value: PRICE.mul(10) })
      const logData = contract.interface.parseLog(getTransferLogs(contract, await tx.wait())[0])
      const ID = logData.args.id.toString()
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
        [addr1.address, addr2.address],
        [10, 1],
        { value: PRICE.mul(1) }
      ))
        .to.be.revertedWith(`InvalidDesposit()`)
    })

    it(`Should allow minting and transferring batches`, async () => {
      const tx = await contract.generateMany(
        [addr4.address, addr4.address, addr5.address],
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
      const ID3 = logData[2].args.id

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
          [addr4.address, addr4.address, addr4.address, addr5.address, addr5.address, addr5.address],
          [ID1, ID2, ID3, ID1, ID2, ID3]
        )).map((n: BigNumber) => n.toNumber())
      ).to.deep.equal([5, 6, 0, 5, 4, 1])
    })

    it(`Should allow minting by depositing ETH`, async () => {
      const tx = await owner.sendTransaction({ to: contract.address, value: PRICE })
      const receipt = await tx.wait()
      const logData = contract.interface.parseLog(getTransferLogs(contract, receipt)[0])
      expect(logData.args.from).to.equal(constants.AddressZero)
      expect(logData.args.to).to.equal(owner.address)
    })

    it(`Should send surplus ETH back when minting by depositing ETH`, async () => {
      expect(await owner.sendTransaction({ to: contract.address, value: PRICE.add(parseEther('0.015')) }))
        .to.changeEtherBalance(owner, PRICE.mul(-2))
    })

    it.skip(`Shouldn't allow people to create genesis tokens`, async () => {
      const tx = await contract.generate(vv.address, '', { value: PRICE })
      const receipt = await tx.wait()
      const logData = contract.interface.parseLog(getTransferLogs(contract, receipt)[0])

      expect(logData.args.from).to.equal(constants.AddressZero)
      expect(logData.args.to).to.equal(vv.address)
      expect(logData.args.value).to.equal(1)
    })

    it(`Should mark tokens as minted when VV mints them`, async () => {
      await expect(contract.connect(vv).generateExisting(constants.AddressZero, vv.address, 0, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, constants.AddressZero, vv.address, 0, 1)

      await expect(contract.connect(vv).generateExisting(constants.AddressZero, owner.address, 2, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, constants.AddressZero, owner.address, 2, 1)

      await expect(contract.connect(vv).generateManyExisting(
        [constants.AddressZero, constants.AddressZero, constants.AddressZero, constants.AddressZero],
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
      await expect(contract.connect(addr3).generateExisting(owner.address, addr3.address, 1, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr3.address, constants.AddressZero, addr3.address, 1, 1)

      await expect(contract.connect(addr3).generateExisting(owner.address, addr3.address, 2, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr3.address, constants.AddressZero, addr3.address, 2, 1)
    })

  })

  describe(`ReGenerating`, () => {

    it(`Should not allow regenerating tokens we don't own`, async () => {
      await contract.connect(vv).generateExisting(constants.AddressZero, vv.address, 0, "", { value: PRICE })
      await contract.connect(vv).generateExisting(
        constants.AddressZero,
        addr5.address,
        7,
        "",
        { value: PRICE.mul(2) }
      )

      await expect(contract.connect(addr4).regenerate(7, 1))
        .to.be.revertedWith(`ERC1155: burn amount exceeds balance`)
      await expect(contract.connect(addr5).regenerate(7, 5))
        .to.be.revertedWith(`ERC1155: burn amount exceeds balance`)

      expect(await contract.balanceOf(addr5.address, 7)).to.equal(2)
      expect(await contract.balanceOf(addr5.address, 0)).to.equal(0)
    })

    it(`Should allow regenerating tokens`, async () => {
      await contract.connect(vv).generateExisting(constants.AddressZero, vv.address, 0, "", { value: PRICE })
      await contract.connect(vv).generateExisting(
        constants.AddressZero,
        addr5.address,
        8,
        "",
        { value: PRICE.mul(2) }
      )

      await expect(await contract.connect(addr5).regenerate(8, 2))
        .to.emit(contract, 'TransferSingle')
        .to.emit(contract, 'TransferSingle')
        // TODO: Check new token ID balances

      expect(await contract.balanceOf(addr5.address, 8)).to.equal(0)
    })

    it(`Should allow regenerating multiple tokens at once`, async () => {
      await contract.connect(vv).generateExisting(constants.AddressZero, vv.address, 19, "", { value: PRICE })

      await contract.connect(vv).generateManyExisting(
        [constants.AddressZero, constants.AddressZero],
        [addr5.address, addr5.address],
        [9, 10],
        [2, 2],
        { value: PRICE.mul(4) }
      )

      await expect(contract.connect(addr5).regenerateMany(
        [9, 10],
        [2, 3],
        [5],
      )).to.be.revertedWith(`ERC1155: burn amount exceeds balance`)

      await expect(contract.connect(addr5).regenerateMany(
        [9, 10],
        [2, 3],
        [4],
      )).to.be.revertedWith(`InvalidInput()`)

      await expect(contract.connect(addr5).regenerateMany(
        [9, 10],
        [2, 2],
        [5],
      )).to.be.revertedWith(`InvalidInput()`)

      await expect(await contract.connect(addr5).regenerateMany(
        [9, 10],
        [2, 2],
        [4, 0],
      ))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr5.address, addr5.address, constants.AddressZero, 9, 2)
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr5.address, addr5.address, constants.AddressZero, 10, 2)
        .to.emit(contract, 'TransferSingle')

      expect(await contract.balanceOf(addr5.address, 9)).to.equal(0)
      expect(await contract.balanceOf(addr5.address, 10)).to.equal(0)
      // TODO: Check new token balance
    })

  })

  describe(`DeGenerating`, () => {

    it(`Should allow degenerating`, async () => {
      const TOKEN = 0
      await contract.connect(vv).generateExisting(constants.AddressZero, addr3.address, TOKEN, '', { value: PRICE.mul(10) })
      const balance = await contract.balanceOf(addr3.address, TOKEN)

      await expect(contract.connect(addr3).degenerate(TOKEN, 1))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr3.address, addr3.address, constants.AddressZero, TOKEN, 1)

      expect(await contract.balanceOf(addr3.address, TOKEN)).to.equal(balance.sub(1))
    })

    it(`Should allow withdrawing funds with specified token amount`, async () => {
      const TOKEN = 0
      await contract.connect(vv).generateExisting(constants.AddressZero, addr2.address, TOKEN, '', { value: PRICE.mul(10) })
      await expect(contract.connect(addr2).degenerate(TOKEN, 50)).to.be.revertedWith(`ERC1155: burn amount exceeds balance`)

      expect(await contract.connect(addr2).degenerate(TOKEN, 5))
        .to.changeEtherBalance(addr2, PRICE.mul(5))
    })

    it(`Should allow withdrawing funds for many tokens`, async () => {
      const TOKEN = 0
      await contract.connect(vv).generateManyExisting(
        [constants.AddressZero, constants.AddressZero, constants.AddressZero, constants.AddressZero],
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

  describe.skip(`Rendering`, () => {
    it(`Renders token SVGs`, async () => {
      let id = 0;

      while (id < 100) {
        const svg = await contract.svg(id)

        fs.writeFileSync(`test/dist/${id}.svg`, svg)

        console.log(`Rendered ${id}`)

        id++
      }
    })

    it(`Renders Black Check SVGs`, async () => {
      let id = 0;

      while (id < 25_000) {
        const svg = await contract.svg(id)

        fs.writeFileSync(`test/dist/${id}.svg`, svg)

        console.log(`Rendered ${id}`)

        id += 4096
      }
    })

    it(`Renders token metadata`, async () => {
      let id = 0;

      while (id < 50) {
        const metadata = decodeBase64URI(await contract.uri(id))

        fs.writeFileSync(`test/dist/${id}.json`, JSON.stringify(metadata, null, 4))

        console.log(`Saved metadata for ${id}`)

        id++
      }
    })

    it(`Renders to PNGs`, async () => {
      await render('test/dist')
    })
  })

})
