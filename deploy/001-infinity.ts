import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import GENESIS_RECIPIENTS from '../GENESIS_0_RECIPIENTS.json'
import { parseEther } from 'ethers';

const PRICE = parseEther('0.008')

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const {deployments, getNamedAccounts} = hre;
	const {deploy} = deployments;

	const {deployer} = await getNamedAccounts();

	const { address: utilitiesAddress } = await deploy('Utilities', {
		from: deployer,
		args: [],
		log: true,
		autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    deterministicDeployment: '0x01',
	});

  const { address: infiniteGeneratorAddress } = await deploy('InfiniteGenerator', {
    from: deployer,
    args: [],
    libraries: {
      Utilities: utilitiesAddress,
    },
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    deterministicDeployment: '0x01',
  })

  const { address: infiniteArtAddress } = await deploy('InfiniteArt', {
    from: deployer,
    args: [],
    libraries: {
      Utilities: utilitiesAddress,
    },
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    deterministicDeployment: '0x01',
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
    deterministicDeployment: '0x01',
  })

  await deploy('Infinity', {
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
    deterministicDeployment: `0x0461`,
  })

};

export default func;

func.tags = ['Infinity'];
