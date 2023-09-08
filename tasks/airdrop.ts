import { task } from 'hardhat/config'
import { ZeroAddress, parseEther } from 'ethers'

import CLAIMS from './../data/infinity-claims.json'
import { chunk } from '../helpers/arrays'
import { impersonate } from '../helpers/impersonate'
import { VV } from '../helpers/constants'

const PRICE = parseEther('0.008')

task('airdrop-claimers', 'Airdrop claimers')
  .addParam('address')
  .setAction(async ({ address }, hre) => {
  const chunks = chunk(CLAIMS, 646)

  const {getNamedAccounts} = hre;

  // // TODO: Replace below two lines...
  // const { deployer } = await getNamedAccounts();
  // const signer = await hre.ethers.getSigner(deployer)
  const vv = await impersonate(VV, hre)
  const signer = vv


  const contract = await hre.ethers.getContractAt('Infinity', address, signer)

  for (const chunk of chunks) {
    const sources = chunk.map(_ => ZeroAddress)
    const recipients = chunk.map(r => r.claimer)
    const tokens = chunk.map(r => r.token_id)
    const amounts = chunk.map(_ => 1)

    const value = PRICE * BigInt(chunk.length)

    await contract.connect(signer).generateManyExisting(sources, recipients, tokens, amounts, {
      value,
    })
  }

})
