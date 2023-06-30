import { HardhatRuntimeEnvironment } from 'hardhat/types'

export const impersonate = async (address: string, hre: HardhatRuntimeEnvironment) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  })

  return await hre.ethers.getSigner(address)
}
