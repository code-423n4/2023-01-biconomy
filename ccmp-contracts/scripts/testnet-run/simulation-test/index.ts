import axios from "axios";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { sourceHyphen, sourceToken, fromChainId, toChainId, toContracts, exitBatchHelper } from "../config";

const tenderlyKey = "OnBQh0eRTnW-TY88S9KYxpXtyeCFh1hK";
const tenderlyUser = "ankurdubey521";
const tenderlyProject = "project";

const hyphen = sourceHyphen();
const token = sourceToken();
const batchHelper = exitBatchHelper();

const baseURL = `https://api.tenderly.co/api/v1/account/${tenderlyUser}/project/${tenderlyProject}`;

const abiCoder = new ethers.utils.AbiCoder();

const CONSISTENCY_LEVEL = 1;

async function simulate(simualtionData: any): Promise<any> {
  const { chainId, data, to, from } = simualtionData;
  const tAxios = tenderlyInstance();
  const body = {
    // standard TX fields
    network_id: chainId.toString(),
    from,
    input: data,
    gas: 8000000,
    gas_price: "0",
    value: "0",
    to,
    // simulation config (tenderly specific)
    save: true,
  };
  const response = await tAxios.post("/simulate", body);

  console.log(response.data);
}

function tenderlyInstance() {
  return axios.create({
    baseURL,
    headers: {
      "X-Access-Key": tenderlyKey || "",
      "Content-Type": "application/json",
    },
  });
}

(async () => {
  const [signer] = await ethers.getSigners();
  const message = {
    chainId: fromChainId,
    data: hyphen.interface.encodeFunctionData("depositAndCall", [
      {
        toChainId,
        tokenAddress: token.address,
        receiver: toContracts.batchHelper,
        amount: BigNumber.from(100).mul(await token.decimals()),
        tag: "CCMPTest",
        payloads: [
          {
            to: toContracts.batchHelper,
            _calldata: batchHelper.interface.encodeFunctionData("execute", [
              toContracts.token,
              toContracts.lpToken,
              toContracts.liquidityProviders,
              toContracts.liquidityFarming,
              signer.address,
            ]),
          },
        ],
        gasFeePaymentArgs: {
          feeTokenAddress: token.address,
          feeAmount: BigNumber.from(10).mul(await token.decimals()),
          relayer: "0x0000000000000000000000000000000000000001",
        },
        adaptorName: "wormhole",
        routerArgs: abiCoder.encode(["uint256"], [CONSISTENCY_LEVEL]),
        hyphenArgs: [],
      },
    ]),
    to: hyphen.address,
    from: signer.address,
  };
})();
