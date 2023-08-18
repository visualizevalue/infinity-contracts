import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import GENESIS_RECIPIENTS from '../data/GENESIS_0_RECIPIENTS.json'
import { parseEther } from 'ethers';

const PRICE = parseEther('0.008')

export const deployWithLibraries = async (
  hre: HardhatRuntimeEnvironment,
  salt: string = '0x3997c69a39dd451b5503e35287918552c9384b529b80b77476919bfe2def4f36'
) => {
  const {deployments, getNamedAccounts} = hre;
	const {deploy} = deployments;

	const {deployer} = await getNamedAccounts();

	const { address: utilitiesAddress } = await deploy('Utilities', {
		from: deployer,
		args: [],
		log: true,
		autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    deterministicDeployment: '0x00',
	});

  const { address: infiniteGeneratorAddress } = await deploy('InfiniteGenerator', {
    from: deployer,
    args: [],
    libraries: {
      Utilities: utilitiesAddress,
    },
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    deterministicDeployment: '0x00',
  })

  const { address: infiniteArtAddress } = await deploy('InfiniteArt', {
    from: deployer,
    args: [],
    libraries: {
      Utilities: utilitiesAddress,
    },
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    deterministicDeployment: '0x00',
  })

  const { address: infiniteMetadataAddress } = await deploy('InfiniteMetadata', {
    from: deployer,
    args: [],
    libraries: {
      Utilities: utilitiesAddress,
      InfiniteArt: infiniteArtAddress,
    },
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    deterministicDeployment: '0x00',
  })

  const { address: infinityAddress } = await deploy('Infinity', {
    value: (PRICE * BigInt(GENESIS_RECIPIENTS.length)).toString(),
    from: deployer,
    args: [GENESIS_RECIPIENTS],
    libraries: {
      InfiniteGenerator: infiniteGeneratorAddress,
      InfiniteArt: infiniteArtAddress,
      InfiniteMetadata: infiniteMetadataAddress,
    },
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    deterministicDeployment: salt,
  })

  return {
    utilitiesAddress,
    infiniteGeneratorAddress,
    infiniteArtAddress,
    infiniteMetadataAddress,
    infinityAddress,
  }
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  await deployWithLibraries(hre)
};

export default func;

func.tags = ['Infinity'];
