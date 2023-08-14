import { task } from 'hardhat/config'
import GENESIS_RECIPIENTS from '../GENESIS_0_RECIPIENTS.json'

task('verify-infinity', 'Verifies the infinity contract')
  .addParam('address', 'the contract address')
  .setAction(async ({ address }, hre) => {
  await hre.run("verify:verify", {
    address,
    constructorArguments: [
      GENESIS_RECIPIENTS,
    ],
  })
})
