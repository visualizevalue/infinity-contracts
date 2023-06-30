import { mine, setBalance } from '@nomicfoundation/hardhat-network-helpers'
import { task } from 'hardhat/config'
import { JALIL } from '../helpers/constants'
import { parseEther } from 'ethers/lib/utils'

task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

task('fund-jalil', 'Funds jalil for testing', async (_, hre) => {
  await setBalance(JALIL, parseEther('100'))
  await setBalance('0xC9979381750d5325378CBE36177E7aB037D87CE1', parseEther('100'))
  await mine(2)
})

task('forward', 'Forward one hour', async (_, hre) => {
  await mine(280)
})
