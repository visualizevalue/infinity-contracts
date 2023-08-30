import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { setBalance } from '@nomicfoundation/hardhat-network-helpers'

export const impersonate = async (address: string, hre: HardhatRuntimeEnvironment) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  })

  setBalance(address, 100n ** 18n)

  return await hre.ethers.getSigner(address)
}
