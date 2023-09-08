import fs from 'fs'
import { expect } from 'chai'
import hre, { deployments } from 'hardhat'
import '@nomicfoundation/hardhat-chai-matchers'
import { ZeroAddress, toBeArray, parseEther, ContractTransactionReceipt, BaseContract, LogDescription } from 'ethers'
import { impersonate } from './../helpers/impersonate'
import { decodeBase64URI } from '../helpers/decode-uri'
import { VV, JALIL } from '../helpers/constants'
import { render } from '../helpers/render-pngs'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { Infinity, ReceiveBlock } from '../typechain-types'

const PRICE = parseEther('0.008')

export const deployContract = deployments.createFixture(async ({deployments, ethers}) => {
  await deployments.fixture(['Infinity', 'Mocks'])

  const Infinity = await deployments.get('Infinity')
  const contract = await ethers.getContractAt('Infinity', Infinity.address)

  const ReceiveBlock = await deployments.get('ReceiveBlock')
  const receiveBlockContract = await ethers.getContractAt('ReceiveBlock', ReceiveBlock.address)

  const [ owner, addr1, addr2, addr3, addr4, addr5 ] = await ethers.getSigners()
  const vv = await impersonate(VV, hre)
  const jalil = await impersonate(JALIL, hre)

  return { contract, owner, addr1, addr2, addr3, addr4, addr5, vv, jalil, receiveBlockContract }
})

// Helper function to get Transfer event logs from the transaction receipt
const getLogs = (
  contract: BaseContract,
  receipt: ContractTransactionReceipt|null,
  event: string = 'TransferSingle'
): LogDescription[] => {
  if (! receipt) return []

  const hash = contract.interface.getEvent(event)?.topicHash
  return receipt.logs
    .filter(log => log.topics[0] === hash)
    .map(log => contract.interface.parseLog(log as unknown as ({ topics: string[]; data: string; })) as LogDescription)
}

describe('Infinity', () => {
  let contract: Infinity,
      receiveBlockContract: ReceiveBlock,
      owner: SignerWithAddress,
      addr1: SignerWithAddress,
      addr2: SignerWithAddress,
      addr3: SignerWithAddress,
      addr4: SignerWithAddress,
      addr5: SignerWithAddress,
      jalil: SignerWithAddress,
      vv: SignerWithAddress

  beforeEach(async () => {
    ({ contract, owner, addr1, addr2, addr3, addr4, addr5, vv, jalil, receiveBlockContract } = await deployContract())
  })

  context('Deployment', () => {
    it(`Should deploy the contract correctly`, async () => {
      expect(await contract.name()).to.equal('Infinity')
      expect(await contract.symbol()).to.equal('∞')
    })

    it(`Should set the right price`, async () => {
      expect(await contract.PRICE()).to.equal(PRICE)
    })

    it(`Should deploy with genesis live token recipients`, async () => {
      expect(await contract.balanceOf(JALIL, 0)).to.equal(1n)
    })
  })

  context('Ether Receive Hook', () => {
    it(`mint x tokens of the same tokenId when sending the amount for x`, async () => {
      const amounts = [1n, 3n, 9n]

      for (const amount of amounts) {
        const tx = await owner.sendTransaction({ to: await contract.getAddress(), value: PRICE*amount })
        const receipt = await tx.wait()
        const logData = getLogs(contract, receipt as ContractTransactionReceipt)[0]

        expect(logData.args.from).to.equal(ZeroAddress)
        expect(logData.args.to).to.equal(owner.address)
        expect(logData.args.value).to.equal(amount)
      }
    })

    it(`mint no token when sending too little`, async () => {
      await expect(owner.sendTransaction({ to: await contract.getAddress(), value: parseEther('0.004') }))
        .to.be.revertedWithCustomError(contract, 'InvalidDeposit()')
    })

    it(`refund remaining after minting/not minting tokens`, async () => {
      await expect(owner.sendTransaction({ to: await contract.getAddress(), value: parseEther('0.012') }))
        .to.changeEtherBalance(owner, PRICE * -1n)
    })

    it(`fails if remaining cannot be sent`, async () => {
      await expect(receiveBlockContract.send(await contract.getAddress(), { value: parseEther('0.012') }))
        .to.be.revertedWithCustomError(receiveBlockContract, 'FailedProxySend()')
    })

    it(`Should allow minting by depositing ETH`, async () => {
      const tx = await owner.sendTransaction({ to: await contract.getAddress(), value: PRICE })
      const receipt = await tx.wait()
      const logData = getLogs(contract, receipt as ContractTransactionReceipt)[0]

      expect(logData.args.from).to.equal(ZeroAddress)
      expect(logData.args.to).to.equal(owner.address)
    })

    it(`Should send surplus ETH back when minting by depositing ETH`, async () => {
      expect(await owner.sendTransaction({ to: await contract.getAddress(), value: PRICE + parseEther('0.015') }))
        .to.changeEtherBalance(owner, PRICE * BigInt(-2))
    })
  })

  context('Generate', () => {
    it(`Shouldn't allow minting for free`, async () => {
      await expect(contract.connect(vv).generate(addr1.address, ''))
        .to.be.reverted
    })

    it(`only emit message when message is given`, async () => {
      await expect(contract.generate(addr1.address, 'The beginning of infinity', { value: PRICE }))
        .to.emit(contract, 'Message')

      await expect(contract.generate(addr1.address, '', { value: PRICE }))
        .not.to.emit(contract, 'Message')
    })

    it(`fails if recipient is zero address`, async () => {
      await expect(contract.generate(ZeroAddress, '', { value: PRICE }))
        .to.be.revertedWith('ERC1155: mint to the zero address')
    })

    it(`Should allow minting without a message`, async () => {
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
        await expect(contract.generate(addr1.address, '', { value: PRICE * BigInt(amount) }))
          .to.emit(contract, 'TransferSingle')
          // TODO: Test parameters manually

        amount *= 2
      }
    })
  })

  context('GenerateExisting', () => {
    it(`fails if source address does not have any token with tokenId`, async () => {
      await expect(contract.generateExisting(JALIL, addr1.address, 123, '', { value: PRICE }))
        .to.revertedWithCustomError(contract, 'InvalidToken()')
    })

    it(`works for non existing tokenIds if VV`, async () => {
      await expect(contract.connect(vv).generateExisting(ZeroAddress, addr1.address, 123, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
    })

    it(`Should mark tokens as minted when VV mints them`, async () => {
      await expect(contract.connect(vv).generateExisting(ZeroAddress, vv.address, 0, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, ZeroAddress, vv.address, 0, 1)

      await expect(contract.connect(vv).generateExisting(ZeroAddress, owner.address, 2, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, ZeroAddress, owner.address, 2, 1)

      await expect(contract.connect(vv).generateManyExisting(
        [ZeroAddress, ZeroAddress, ZeroAddress, ZeroAddress],
        [owner.address, addr1.address, addr2.address, addr3.address],
        [1, 2, 3, 4],
        [1, 1, 1, 1],
        { value: PRICE * BigInt(4) }
      ))
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, ZeroAddress, owner.address, 1, 1)
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, ZeroAddress, addr1.address, 2, 1)
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, ZeroAddress, addr2.address, 3, 1)
        .to.emit(contract, 'TransferSingle')
        .withArgs(vv.address, ZeroAddress, addr3.address, 4, 1)

      // It should then allow others to mint these as well
      await expect(contract.connect(addr3).generateExisting(owner.address, addr3.address, 1, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr3.address, ZeroAddress, addr3.address, 1, 1)

      await expect(contract.connect(addr3).generateExisting(owner.address, addr3.address, 2, '', { value: PRICE }))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr3.address, ZeroAddress, addr3.address, 2, 1)
    })
  })

  context('Regenerate', () => {
    it(`fails if sender does not have amount of tokenId`, async () => {
      await expect(contract.connect(jalil).regenerate(0, 2))
        .to.revertedWith('ERC1155: burn amount exceeds balance')

      await expect(contract.connect(jalil).regenerate(0, 1))
        .not.to.be.reverted
    })

    it(`fails if tokenId does not exist (should be the same reason as above)`, async () => {
      await expect(contract.connect(jalil).regenerate(123, 1))
        .to.revertedWith('ERC1155: burn amount exceeds balance')
    })

    it(`mint the same amount of tokens burned of a random id`, async () => {
      const createTx = await jalil.sendTransaction({ to: await contract.getAddress(), value: PRICE*5n })
      const createReceipt = await createTx.wait()
      const createLog = getLogs(contract, createReceipt as ContractTransactionReceipt)[0]
      const tokenId = createLog.args.id

      const regenerateTx = await contract.connect(jalil).regenerate(tokenId, 5n)
      const regenerateReceipt = await regenerateTx.wait()
      const regenerateLog = getLogs(contract, regenerateReceipt as ContractTransactionReceipt)

      const newTokenId = regenerateLog[1].args.id
      expect(regenerateLog[0].args).to.deep.equal([
        jalil.address,
        jalil.address,
        ZeroAddress,
        tokenId,
        5n
      ])
      expect(regenerateLog[1].args).to.deep.equal([
        jalil.address,
        ZeroAddress,
        jalil.address,
        newTokenId,
        5n
      ])
    })

    it(`Should not allow regenerating tokens we don't own`, async () => {
      await contract.connect(vv).generateExisting(ZeroAddress, vv.address, 0, "", { value: PRICE })
      await contract.connect(vv).generateExisting(
        ZeroAddress,
        addr5.address,
        7,
        "",
        { value: PRICE * BigInt(2) }
      )

      await expect(contract.connect(addr4).regenerate(7, 1))
        .to.be.revertedWith(`ERC1155: burn amount exceeds balance`)
      await expect(contract.connect(addr5).regenerate(7, 5))
        .to.be.revertedWith(`ERC1155: burn amount exceeds balance`)

      expect(await contract.balanceOf(addr5.address, 7)).to.equal(2)
      expect(await contract.balanceOf(addr5.address, 0)).to.equal(0)
    })

    it(`Should allow regenerating tokens`, async () => {
      await contract.connect(vv).generateExisting(ZeroAddress, vv.address, 0, "", { value: PRICE })
      await contract.connect(vv).generateExisting(
        ZeroAddress,
        addr5.address,
        8,
        "",
        { value: PRICE * BigInt(2) }
      )

      await expect(await contract.connect(addr5).regenerate(8, 2))
        .to.emit(contract, 'TransferSingle')
        .to.emit(contract, 'TransferSingle')
        // TODO: Check new token ID balances

      expect(await contract.balanceOf(addr5.address, 8)).to.equal(0)
    })
  })

  context('Degenerate', () => {
    it(`fails if sender does not have amount of tokenId`, async () => {
      await expect(contract.connect(jalil).degenerate(0, 2))
        .to.revertedWith('ERC1155: burn amount exceeds balance')

      await expect(contract.connect(jalil).degenerate(0, 1))
        .not.to.be.reverted
    })

    it(`fails if tokenId does not exist (should be the same reason as above)`, async () => {
      await expect(contract.connect(jalil).degenerate(123, 1))
        .to.revertedWith('ERC1155: burn amount exceeds balance')
    })

    it(`refunds correct amount if sender did have amount of tokenId`, async () => {
      await expect(contract.connect(jalil).degenerate(0, 1))
        .to.changeEtherBalance(jalil, PRICE)
    })

    it(`Should allow degenerating`, async () => {
      const TOKEN = 0
      await contract.connect(vv).generateExisting(ZeroAddress, addr3.address, TOKEN, '', { value: PRICE * BigInt(10) })
      const balance = await contract.balanceOf(addr3.address, TOKEN)

      await expect(contract.connect(addr3).degenerate(TOKEN, 1))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr3.address, addr3.address, ZeroAddress, TOKEN, 1)

      expect(await contract.balanceOf(addr3.address, TOKEN)).to.equal(balance - 1n)
    })

    it(`Should allow withdrawing funds with specified token amount`, async () => {
      const TOKEN = 0
      await contract.connect(vv).generateExisting(ZeroAddress, addr2.address, TOKEN, '', { value: PRICE * BigInt(10) })
      await expect(contract.connect(addr2).degenerate(TOKEN, 50)).to.be.revertedWith(`ERC1155: burn amount exceeds balance`)

      expect(await contract.connect(addr2).degenerate(TOKEN, 5))
        .to.changeEtherBalance(addr2, PRICE * BigInt(5))
    })
  })

  context('GenerateMany', () => {
    it(`fails if recipients and amounts have different length`, async () => {
      await expect(contract.generateMany(
        [addr1.address, addr2.address],
        [1n, 2n, 3n],
        { value: PRICE*3n }
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')

      await expect(contract.generateMany(
        [addr1.address, addr2.address, addr3.address],
        [1n, 2n],
        { value: PRICE*3n }
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')

      await expect(contract.generateMany(
        [addr1.address, addr2.address],
        [1n, 2n, 3n],
        { value: PRICE*6n }
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')
    })

    it(`fails if not sending the exact amount for nr tokens minted`, async () => {
      await expect(contract.generateMany(
        [addr1.address, addr2.address],
        [1n, 2n],
        { value: PRICE*4n }
      )).to.be.revertedWithCustomError(contract, 'InvalidDeposit')

      await expect(contract.generateMany(
        [addr1.address, addr2.address],
        [1n, 2n],
        { value: PRICE*3n }
      )).not.to.be.reverted
    })

    it(`mint amount of different random tokenIds to given recipients`, async () => {
      await expect(contract.generateMany(
        [addr1.address, addr2.address],
        [1n, 2n],
        { value: PRICE*3n }
      )).to.emit(contract, 'TransferSingle')
        .to.emit(contract, 'TransferSingle')
    })

    it(`fails if any recipient is zero address`, async () => {
      await expect(contract.generateMany(
        [addr1.address, ZeroAddress],
        [1n, 2n],
        { value: PRICE*3n }
      )).to.be.revertedWith('ERC1155: mint to the zero address')
    })

    it(`fails if any amount is zero`, async () => {
      await expect(contract.generateMany(
        [addr1.address, addr2.address],
        [1n, 0n],
        { value: PRICE }
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')
    })

    it(`Should allow minting many different tokens`, async () => {
      const tx = await contract.connect(addr1).generateMany(
        [addr1.address, addr1.address],
        [9, 19],
        { value: PRICE * BigInt(9 + 19) }
      )
      const logs = getLogs(contract, await tx.wait())
      const log1Data = logs[0] as LogDescription
      const log2Data = logs[1] as LogDescription
      expect(log1Data.args.from).to.equal(ZeroAddress)
      expect(log2Data.args.from).to.equal(ZeroAddress)
      expect(log1Data.args.to).to.equal(addr1.address)
      expect(log2Data.args.to).to.equal(addr1.address)
      expect(log1Data.args.id).not.to.equal(log2Data.args.id)
      expect(log1Data.args.value).to.equal(9)
      expect(log2Data.args.value).to.equal(19)
    })

    it(`Shouldn't let users define more recipients than amounts`, async () => {
      await expect(contract.generateMany(
        [addr1.address, addr2.address, addr3.address],
        [10, 1],
        { value: PRICE * BigInt(11) }
      ))
        .to.be.revertedWithCustomError(contract, `InvalidInput()`)
    })
  })

  context('GenerateManyExisting', () => {
    it(`fails if arguments have different lengths`, async () => {
      await expect(contract.generateManyExisting(
        [jalil.address, jalil.address],
        [addr1.address, addr2.address],
        [0n, 0n],
        [1n, 2n, 3n],
        { value: PRICE*3n }
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')

      await expect(contract.generateManyExisting(
        [jalil.address, jalil.address],
        [addr1.address, addr2.address, addr3.address],
        [0n, 0n],
        [1n, 2n, 3n],
        { value: PRICE*3n }
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')
    })

    it(`fails if not sending the exact amount for nr tokens minted`, async () => {
      await expect(contract.generateManyExisting(
        [jalil.address, jalil.address],
        [addr1.address, addr2.address],
        [0n, 0n],
        [1n, 2n],
        { value: PRICE*4n }
      )).to.be.revertedWithCustomError(contract, 'InvalidDeposit')

      await expect(contract.generateManyExisting(
        [jalil.address, jalil.address],
        [addr1.address, addr2.address],
        [0n, 0n],
        [1n, 2n],
        { value: PRICE*3n }
      )).not.to.be.reverted
    })

    it(`fails if any source address does not have any token with tokenId`, async () => {
      await expect(contract.generateManyExisting(
        [jalil.address, addr3.address],
        [addr1.address, addr2.address],
        [0n, 0n],
        [1n, 2n],
        { value: PRICE*3n }
      )).to.be.revertedWithCustomError(contract, 'InvalidToken')
    })

    it(`works for non existing tokenIds if VV`, async () => {
      await expect(contract.connect(vv).generateManyExisting(
        [ZeroAddress, ZeroAddress],
        [addr1.address, addr2.address],
        [95n, 99n],
        [1n, 2n],
        { value: PRICE*3n }
      )).not.to.be.reverted
    })

    it(`fails if any recipient is zero address`, async () => {
      await expect(contract.connect(vv).generateManyExisting(
        [ZeroAddress, ZeroAddress],
        [addr1.address, ZeroAddress],
        [95n, 99n],
        [1n, 2n],
        { value: PRICE*3n }
      )).to.be.revertedWith('ERC1155: mint to the zero address')
    })

    it(`fails if any amount is zero`, async () => {
      await expect(contract.connect(vv).generateManyExisting(
        [ZeroAddress, ZeroAddress],
        [addr1.address, ZeroAddress],
        [95n, 99n],
        [0n, 2n],
        { value: PRICE*2n }
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')
    })

    it(`mint amount of existing tokenIds to given recipients`, async () => {
      await expect(contract.generateManyExisting(
        [jalil.address, jalil.address],
        [addr1.address, addr2.address],
        [0n, 0n],
        [1n, 2n],
        { value: PRICE*3n }
      )).to.emit(contract, 'TransferSingle')
        .to.emit(contract, 'TransferSingle')
    })

    it(`Shouldn't let users overpay when generating many`, async () => {
      await expect(contract.generateMany(
        [addr1.address, addr2.address],
        [10, 1, 1],
        { value: PRICE * BigInt(12) }
      ))
        .to.be.revertedWithCustomError(contract, `InvalidInput()`)

      await contract.connect(vv).generateExisting(ZeroAddress, vv.address, 9, '', { value: PRICE })
      await expect(contract.connect(addr1).generateManyExisting(
        [ZeroAddress, ZeroAddress],
        [addr1.address, addr2.address, addr3.address],
        [0, 9],
        [10, 2],
        { value: PRICE * BigInt(12) }
      )).to.be.revertedWithCustomError(contract, `InvalidInput()`)
      await expect(contract.connect(addr1).generateManyExisting(
        [ZeroAddress, ZeroAddress, ZeroAddress],
        [addr1.address, addr2.address, addr3.address],
        [0, 9, 0],
        [10, 2],
        { value: PRICE * BigInt(12) }
      )).to.be.revertedWithCustomError(contract, `InvalidInput()`)
    })
  })

  context('RegenerateMany', () => {
    let tokenIds: bigint[] = []

    beforeEach(async () => {
      const createTx = await contract.generateMany(
        [jalil.address, jalil.address],
        [5n, 9n],
        { value: PRICE*14n }
      )
      const createReceipt = await createTx.wait()
      const createLog = getLogs(contract, createReceipt as ContractTransactionReceipt)

      tokenIds = createLog.map(log => log.args.id)
    })

    it(`fails if arguments have different lengths`, async () => {
      await expect(contract.connect(jalil).regenerateMany(
        tokenIds,
        [0n, 9n, 5n],
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')

      await expect(contract.connect(jalil).regenerateMany(
        [0n, ...tokenIds],
        [9n, 5n],
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')
    })

    it(`fails if sender does not have amount of any tokenId`, async () => {
      await expect(contract.connect(jalil).regenerateMany(
        tokenIds,
        [9n, 5n],
      )).to.be.revertedWith('ERC1155: burn amount exceeds balance')

      await expect(contract.connect(jalil).regenerateMany(
        tokenIds,
        [5n, 9n],
      )).not.to.be.reverted
    })

    it(`mint and burn the same amount of tokens`, async () => {
      const tx = await contract.connect(jalil).regenerateMany(
        tokenIds,
        [5n, 9n],
      )
      const receipt = await tx.wait()
      const log = getLogs(contract, receipt as ContractTransactionReceipt)

      expect(log[0].args).to.deep.equal([
        jalil.address,
        jalil.address,
        ZeroAddress,
        tokenIds[0],
        5n
      ])
      expect(log[1].args).to.deep.equal([
        jalil.address,
        ZeroAddress,
        jalil.address,
        log[1].args.id,
        5n
      ])
      expect(log[2].args).to.deep.equal([
        jalil.address,
        jalil.address,
        ZeroAddress,
        tokenIds[1],
        9n
      ])
      expect(log[3].args).to.deep.equal([
        jalil.address,
        ZeroAddress,
        jalil.address,
        log[3].args.id,
        9n
      ])
    })

    it(`Should allow regenerating multiple tokens at once`, async () => {
      await contract.connect(vv).generateExisting(ZeroAddress, vv.address, 19, "", { value: PRICE })

      await contract.connect(vv).generateManyExisting(
        [ZeroAddress, ZeroAddress],
        [addr5.address, addr5.address],
        [9, 10],
        [2, 2],
        { value: PRICE * BigInt(4) }
      )

      await expect(contract.connect(addr5).regenerateMany(
        [9, 10],
        [2, 3],
      )).to.be.revertedWith(`ERC1155: burn amount exceeds balance`)

      await expect(await contract.connect(addr5).regenerateMany(
        [9, 10],
        [2, 2],
      ))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr5.address, addr5.address, ZeroAddress, 9, 2)
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr5.address, addr5.address, ZeroAddress, 10, 2)
        .to.emit(contract, 'TransferSingle')

      expect(await contract.balanceOf(addr5.address, 9)).to.equal(0)
      expect(await contract.balanceOf(addr5.address, 10)).to.equal(0)
      // TODO: Check new token balance
    })
  })

  context('DegenerateMany', () => {
    let tokenIds: bigint[] = []

    beforeEach(async () => {
      const createTx = await contract.generateMany(
        [jalil.address, jalil.address],
        [5n, 9n],
        { value: PRICE*14n }
      )
      const createReceipt = await createTx.wait()
      const createLog = getLogs(contract, createReceipt as ContractTransactionReceipt)

      tokenIds = createLog.map(log => log.args.id)
    })

    it(`fails if arguments have different lengths`, async () => {
      await expect(contract.connect(jalil).degenerateMany(
        tokenIds,
        [0n, 9n, 5n],
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')

      await expect(contract.connect(jalil).degenerateMany(
        [0n, ...tokenIds],
        [9n, 5n],
      )).to.be.revertedWithCustomError(contract, 'InvalidInput')
    })

    it(`refunds correct value if all tokens could be burnt`, async () => {
      await expect(contract.connect(jalil).degenerateMany(
        tokenIds,
        [5n, 9n],
      )).to.changeEtherBalance(jalil, PRICE * 14n)
    })

    it(`Shouldn't allow minting batches with an invalid deposit`, async () => {
      await expect(contract.generateMany(
        [addr1.address, addr2.address],
        [10, 1],
        { value: PRICE * BigInt(1) }
      ))
        .to.be.revertedWithCustomError(contract, `InvalidDeposit()`)
    })

    it(`Should allow withdrawing funds for many tokens`, async () => {
      const TOKEN = 0
      await contract.connect(vv).generateManyExisting(
        [ZeroAddress, ZeroAddress, ZeroAddress, ZeroAddress],
        [addr4.address, addr4.address, addr5.address, addr5.address],
        [TOKEN, TOKEN + 1, TOKEN, TOKEN + 1],
        [10, 10, 10, 10],
        { value: PRICE * BigInt(40) }
      )
      await expect(contract.connect(addr4).degenerateMany([TOKEN, TOKEN+1], [5, 5]))
        .to.emit(contract, 'TransferBatch')
        .withArgs(addr4.address, addr4.address, ZeroAddress, [TOKEN, TOKEN+1], [5, 5])

      expect(await contract.connect(addr5).degenerateMany([TOKEN, TOKEN+1], [5, 5]))
        .to.changeEtherBalance(addr5, PRICE * BigInt(10))
    })
  })

  context('Transfers', () => {
    it(`Should allow transferring assets`, async () => {
      const tx = await contract.connect(addr2).generate(addr2.address, '', { value: PRICE * BigInt(10) })
      const logData = getLogs(contract, await tx.wait())[0]
      const ID = logData.args.id.toString()
      expect(logData.args.from).to.equal(ZeroAddress)
      expect(logData.args.to).to.equal(addr2.address)
      expect(logData.args.value).to.equal(10)

      expect(await contract.balanceOf(addr2.address, ID)).to.equal(10)

      await expect(contract.connect(addr2).safeTransferFrom(addr2.address, addr3.address, ID, 1, toBeArray(0)))
        .to.emit(contract, 'TransferSingle')
        .withArgs(addr2.address, addr2.address, addr3.address, ID, 1)

      expect(await contract.balanceOf(addr2.address, ID)).to.equal(9)
      expect(await contract.balanceOf(addr3.address, ID)).to.equal(1)
    })

    it(`Should allow minting and transferring batches`, async () => {
      const tx = await contract.generateMany(
        [addr4.address, addr4.address, addr5.address],
        [10, 10, 1],
        { value: PRICE * BigInt(21) }
      )
      const logData = getLogs(contract, await tx.wait())
      expect(logData.length).to.equal(3)
      expect(logData[0].args.from).to.equal(ZeroAddress)
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
        toBeArray(0)
      ))
        .to.emit(contract, 'TransferBatch')
        .withArgs(addr4.address, addr4.address, addr5.address, [ID1, ID2], [5, 4])

      expect((await contract
        .connect(addr4)
        .balanceOfBatch(
          [addr4.address, addr4.address, addr4.address, addr5.address, addr5.address, addr5.address],
          [ID1, ID2, ID3, ID1, ID2, ID3]
        )).map((n: BigInt) => Number(n))
      ).to.deep.equal([5, 6, 0, 5, 4, 1])
    })
  })

  context.skip(`Rendering`, () => {
    it(`Renders token SVGs`, async () => {
      let id = 0;

      while (id < 50) {
        const svg = await contract.svg(id)

        fs.writeFileSync(`test/dist/${id}.svg`, svg)

        console.log(`Rendered ${id}`)

        id++
      }
    })

    it(`Renders Black Check SVGs`, async () => {
      let id = 0;

      while (id < 15_000) {
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
