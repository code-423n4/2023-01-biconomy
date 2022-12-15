import axios from "axios";
import type { IBackendConfig } from "../types";
import { addSupportedTokenSmartContract } from "./add-supported-token";

interface IDeployConfigData {
  chainId: number;
  depositConfig: IChainConfig;
}

interface IChainConfig {
  toChainIds: number[];
  tokenAddresses: string[];
  tokenConfigs: ITokenConfig[];
}

interface ITokenConfig {
  max: string;
  min: string;
}

const setConfig = async (configData: IDeployConfigData[], backendConfig: IBackendConfig) => {
  let response: any = { message: "Execution Finish", code: 200 };
  for (let i = 0; i < configData.length; i++) {
    try {
      const depositConfigRes = await axios.post(
        `${backendConfig.baseUrl}/api/v1/admin/supported-token/smart-contract/set-deposit-config`,
        configData[i],
        {
          headers: {
            username: backendConfig.apiUsername,
            password: backendConfig.apiPassword,
            key: backendConfig.apiKey,
          },
        }
      );
      const data = await depositConfigRes.data;

      response[i] = {
        message: data.message,
        code: data.code,
        txHash: data.txHash,
      };
    } catch (error) {
      console.error(
        `Error while adding ${JSON.stringify(configData[i])}: ${JSON.stringify((error as any).response.data)}`
      );
    }
  }

  console.log(response);
};

export { setConfig };
