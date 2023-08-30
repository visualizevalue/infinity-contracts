import { expect } from 'chai'
import hre, { deployments } from 'hardhat'
import '@nomicfoundation/hardhat-chai-matchers'
import { ZeroAddress, parseEther, ContractTransactionReceipt, BaseContract, LogDescription } from 'ethers'
import { impersonate } from './../helpers/impersonate'
import { VV, JALIL } from '../helpers/constants'
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

  context.skip('Deployment', () => {
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
  })

  context('Generate', () => {
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
  })

})
