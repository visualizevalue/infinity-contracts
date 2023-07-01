export const deployInfinityWithLibraries = async (ethers) => {
  // const eightyColors = await ethers.getContractAt('EightyColors', process.env.EIGHTY_COLORS_ADDRESS)

  const InfiniteArt = await ethers.getContractFactory('InfiniteArt', {
    // libraries: {
    //   // Utilities: utils.address,
    //   EightyColors: process.env.EIGHTY_COLORS_ADDRESS,
    // }
  })
  const infiniteArt = await InfiniteArt.deploy()
  await infiniteArt.deployed()
  console.log(`     Deployed InfiniteArt at ${infiniteArt.address}`)

  const InfiniteMetadata = await ethers.getContractFactory('InfiniteMetadata', {
    libraries: {
      // Utilities: utils.address,
      InfiniteArt: infiniteArt.address,
    }
  })
  const infiniteMetadata = await InfiniteMetadata.deploy()
  await infiniteMetadata.deployed()
  console.log(`     Deployed InfiniteMetadata at ${infiniteMetadata.address}`)

  const Infinity = await ethers.getContractFactory('Infinity', {
    libraries: {
      // Utilities: utils.address,
      InfiniteArt: infiniteArt.address,
      InfiniteMetadata: infiniteMetadata.address,
    }
  })

  const infinity = await Infinity.deploy()
  await infinity.deployed()
  console.log(`     Deployed Infinity at ${infinity.address}`)

  return {
    infinity,
  }
}