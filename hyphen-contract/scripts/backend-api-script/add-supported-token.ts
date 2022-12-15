import axios from "axios";
import type { IBackendConfig } from "../types";

const addSupportedTokenDb = async (configData: any, backendConfig: IBackendConfig) => {
  let response: any = { message: "Execution Finish", code: 200 };

  for (let i = 0; i < configData.length; i++) {
    try {
      const tokenConfigRes = await axios.post(
        `${backendConfig.baseUrl}/api/v1/admin/supported-token/db/add`,
        configData[i],
        {
          headers: {
            username: backendConfig.apiUsername,
            password: backendConfig.apiPassword,
            key: backendConfig.apiKey,
          },
        }
      );
      const data = tokenConfigRes.data;
      if (!data.pairOne) {
        response[i] = {
          code: data.code,
          message: data.message,
        };
      } else {
        response[i] = {
          pairOne: data.pairOne,
          pairTwo: data.pairTwo,
        };
      }
    } catch (error) {
      console.error(
        `Error while adding ${JSON.stringify(configData[i])}: ${JSON.stringify((error as any).response.data)}`
      );
    }
    console.log(response);
  }
};

const addSupportedTokenSmartContract = async (configData: any, backendConfig: IBackendConfig) => {
  let response: any = { message: "Execution Finish", code: 200 };

  for (let i = 0; i < configData.length; i++) {
    try {
      const tokenConfigRes = await axios.post(
        `${backendConfig.baseUrl}/api/v1/admin/supported-token/smart-contract/add`,
        configData[i],
        {
          headers: {
            username: backendConfig.apiUsername,
            password: backendConfig.apiPassword,
            key: backendConfig.apiKey,
          },
        }
      );
      const data = tokenConfigRes.data;
      if (!data.pairOne) {
        response[i] = {
          code: data.code,
          message: data.message,
        };
      } else {
        response[i] = {
          pairOne: data.pairOne,
          pairTwo: data.pairTwo,
        };
      }
    } catch (error) {
      console.error(
        `Error while adding ${JSON.stringify(configData[i])}: ${JSON.stringify((error as any).response.data)}`
      );
    }
    console.log(response);
  }
};

export { addSupportedTokenDb as setTokenConfig, addSupportedTokenSmartContract };
