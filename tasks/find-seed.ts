import { task } from 'hardhat/config'
import { AbiCoder, getCreate2Address, id, keccak256, toBeHex } from 'ethers'
import { deployWithLibraries } from './../deploy/001-infinity'
import GENESIS_RECIPIENTS from './../data/GENESIS_0_RECIPIENTS.json'

async function findSaltForAddress(
  desiredPrefix: string,
  desiredSuffix: string,
  seedOffset: string,
  initCodeHash: string,
): Promise<string[]> {
  const deployer = '0x4e59b44847b379578588920cA78FbF26c0B4956C'
  const startSeed = BigInt(id(seedOffset))
  console.log(`Using start seed ${seedOffset} (${startSeed})`)

  let salt = 1n
  while (true) {
    const saltHex = toBeHex(salt + startSeed, 32)

    const address = getCreate2Address(deployer, saltHex, initCodeHash)

    const hasCorrectPrefix = address.toLowerCase().startsWith(desiredPrefix)
    const hasCorrectSuffix = address.slice(42 - desiredSuffix.length) == desiredSuffix
    if (hasCorrectPrefix && hasCorrectSuffix) {
      return [saltHex, address]
    }
    salt++
    if (salt % 1_000_000n === 0n) {
      console.log(`${salt} tries so far`)
    }
  }
}

task('find-salt', 'Find salt for desired contract address prefix')
  .addParam('prefix', 'The desired address prefix')
  .addParam('suffix', 'The desired address suffix')
  .addParam('seed', 'Initial seed')
  .setAction(async (args, hre) => {
    const { ethers } = hre

    const {
      infiniteGeneratorAddress,
      infiniteArtAddress,
      infiniteMetadataAddress,
    } = await deployWithLibraries(hre)

    const factory = await ethers.getContractFactory('Infinity', {
      libraries: {
        InfiniteGenerator: infiniteGeneratorAddress,
        InfiniteArt: infiniteArtAddress,
        InfiniteMetadata: infiniteMetadataAddress,
      },
    })

    const constructorArguments = AbiCoder.defaultAbiCoder()
      .encode(['address[]'], [GENESIS_RECIPIENTS])
      .slice(2) // strip 0x

    const initCode = factory.bytecode + constructorArguments
    const initCodeHash = keccak256(initCode)

    console.log(`Searching for salt to get address with prefix ${args.prefix} and suffix ${args.suffix}...`)
    const [salt, address] = await findSaltForAddress(args.prefix, args.suffix, args.seed, initCodeHash)
    console.log(`Found salt: ${salt}; final address: ${address}`)
  })
