import fs from "fs";
import { task } from "hardhat/config";
import { formatEther, parseEther } from "ethers";

import HOLDINGS from "./../data/infinities-holdings.json";
import GAS_SPEND from "./../data/infinities-gas-spent.json";
import { chunk } from "../helpers/arrays";

const PRICE = parseEther("0.008");

task("refund-test", "Refund token holdings and gas spent")
  .addParam("address")
  .setAction(async ({ address }, hre) => {
    const { getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const signer = await hre.ethers.getSigner(deployer);
    const contract = await hre.ethers.getContractAt("BatchSend", address, signer);

    const addresses = [
      "0xD1295FcBAf56BF1a6DFF3e1DF7e437f987f6feCa",
      "0xe11Da9560b51f8918295edC5ab9c0a90E9ADa20B",
    ];
    const amounts = ["2", "1"];

    const value = amounts.reduce((amount, a) => amount + BigInt(a), 0n);

    await contract.send(addresses, amounts, {
      value,
    });
  });

task("refund", "Refund token holdings and gas spent")
  .addParam("address")
  .setAction(async ({ address }, hre) => {
    const accounts: { [key: string]: any } = {};

    for (const account of HOLDINGS) {
      accounts[account.address] = account;
    }

    for (const account of GAS_SPEND) {
      if (!accounts[account.address]) {
        continue;
      }

      accounts[account.address] = {
        ...accounts[account.address],
        ...account,
      };
    }

    const refunds = Object.values(accounts).map((a) => {
      const valueHeld = PRICE * BigInt(a.amount);
      const totalRefund = valueHeld + BigInt(a.totalfee || 0);

      return {
        ...a,
        totalFeeInEth: formatEther(a.totalfee || 0),
        valueHeld: valueHeld.toString(),
        valueHeldEth: formatEther(valueHeld),
        totalRefund: totalRefund.toString(),
        totalRefundEth: formatEther(totalRefund),
      };
    });

    const totalRefunds = refunds.reduce((amount, r) => amount + BigInt(r.totalRefund), 0n);
    console.log(formatEther(totalRefunds), "ether");

    fs.writeFileSync(`data/refunds.json`, JSON.stringify(refunds, null, 4));

    const chunks = chunk(refunds, 1500);

    const { getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const signer = await hre.ethers.getSigner(deployer);
    const contract = await hre.ethers.getContractAt("BatchSend", address, signer);

    for (const chunk of chunks) {
      const addresses = chunk.map((r) => r.address);
      const amounts = chunk.map((r) => r.totalRefund);

      const value = amounts.reduce((amount, a) => amount + BigInt(a), 0n);

      await contract.send(addresses, amounts, {
        value,
      });
    }
  });
