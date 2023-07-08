import { task } from 'hardhat/config'
import { deployInfinityWithLibraries } from '../helpers/deploy'

task('deploy', 'Deploys the contracts', async (_, hre) => {
  const { infinity } = await deployInfinityWithLibraries(hre.ethers)

  console.log(`Deployed: ${infinity.address}`)
})
