import { parseEther } from "ethers"
import { Infinity } from "../typechain-types"

const PRICE = parseEther('0.008')

export const deployInfinityWithLibraries = async (ethers, genesisRecipients: string[] = []) => {
  const Utilities = await ethers.getContractFactory('Utilities')
  const utilities = await Utilities.deploy()
  await utilities.waitForDeployment()

  const InfiniteGenerator = await ethers.getContractFactory('InfiniteGenerator', {
    libraries: {
      Utilities: await utilities.getAddress(),
    }
  })

  const infiniteGenerator = await InfiniteGenerator.deploy()
  await infiniteGenerator.waitForDeployment()
  console.log(`     Deployed InfiniteGenerator at ${await infiniteGenerator.getAddress()}`)

  const InfiniteArt = await ethers.getContractFactory('InfiniteArt', {
    libraries: {
      Utilities: await utilities.getAddress(),
    }
  })
  const infiniteArt = await InfiniteArt.deploy()
  await infiniteArt.waitForDeployment()
  console.log(`     Deployed InfiniteArt at ${await infiniteArt.getAddress()}`)

  const InfiniteMetadata = await ethers.getContractFactory('InfiniteMetadata', {
    libraries: {
      Utilities: await utilities.getAddress(),
      InfiniteArt: await infiniteArt.getAddress(),
    }
  })
  const infiniteMetadata = await InfiniteMetadata.deploy()
  await infiniteMetadata.waitForDeployment()
  console.log(`     Deployed InfiniteMetadata at ${await infiniteMetadata.getAddress()}`)

  const Infinity = await ethers.getContractFactory('Infinity', {
    libraries: {
      InfiniteGenerator: await infiniteGenerator.getAddress(),
      InfiniteArt: await infiniteArt.getAddress(),
      InfiniteMetadata: await infiniteMetadata.getAddress(),
    }
  })

  const infinity = await Infinity.deploy(genesisRecipients, { value: PRICE * BigInt(genesisRecipients.length) })
  await infinity.waitForDeployment()
  console.log(`     Deployed Infinity at ${await infinity.getAddress()}`)

  return {
    infinity: infinity as Infinity,
  }
}
