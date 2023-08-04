import { parseEther } from "ethers/lib/utils"

const PRICE = parseEther('0.008')

export const deployInfinityWithLibraries = async (ethers, genesisRecipients: string[] = []) => {
  const Utilities = await ethers.getContractFactory('Utilities')
  const utilities = await Utilities.deploy()
  await utilities.deployed()

  const InfiniteGenerator = await ethers.getContractFactory('InfiniteGenerator', {
    libraries: {
      Utilities: utilities.address,
    }
  })

  const infiniteGenerator = await InfiniteGenerator.deploy()
  await infiniteGenerator.deployed()
  console.log(`     Deployed InfiniteGenerator at ${infiniteGenerator.address}`)

  const InfiniteArt = await ethers.getContractFactory('InfiniteArt', {
    libraries: {
      Utilities: utilities.address,
    }
  })
  const infiniteArt = await InfiniteArt.deploy()
  await infiniteArt.deployed()
  console.log(`     Deployed InfiniteArt at ${infiniteArt.address}`)

  const InfiniteMetadata = await ethers.getContractFactory('InfiniteMetadata', {
    libraries: {
      Utilities: utilities.address,
      InfiniteArt: infiniteArt.address,
    }
  })
  const infiniteMetadata = await InfiniteMetadata.deploy()
  await infiniteMetadata.deployed()
  console.log(`     Deployed InfiniteMetadata at ${infiniteMetadata.address}`)

  const Infinity = await ethers.getContractFactory('Infinity', {
    libraries: {
      InfiniteGenerator: infiniteGenerator.address,
      InfiniteArt: infiniteArt.address,
      InfiniteMetadata: infiniteMetadata.address,
    }
  })

  const infinity = await Infinity.deploy(genesisRecipients, { value: PRICE.mul(genesisRecipients.length) })
  await infinity.deployed()
  console.log(`     Deployed Infinity at ${infinity.address}`)

  return {
    infinity,
  }
}
