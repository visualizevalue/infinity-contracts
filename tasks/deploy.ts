import { task } from 'hardhat/config'
import { deployInfinityWithLibraries } from '../helpers/deploy'
import GENESIS_RECIPIENTS from '../GENESIS_0_RECIPIENTS.json'

task('deploy', 'Deploys the contracts', async (_, hre) => {
  const { infinity } = await deployInfinityWithLibraries(hre.ethers, GENESIS_RECIPIENTS)

  console.log(`Deployed: ${infinity.address}`)
})
