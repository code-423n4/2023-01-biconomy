import axios from "axios";
import { setTokenConfig } from "./add-supported-token";
import { getBackendConfig } from "./utils";

(async () => {
  const backendConfig = getBackendConfig("integration");
  const tokenData = (await axios.get(`${backendConfig.baseUrl}/api/v1/configuration/tokens`)).data.message as any;
  const promises = [];
  for (const token of tokenData) {
    const chainWiseData: any[] = [];
    for (const [key, value] of Object.entries(token)) {
      if (!isNaN(parseInt(key))) {
        chainWiseData.push([key, value]);
      }
    }
    for (let i = 0; i < chainWiseData.length; i++) {
      for (let j = i + 1; j < chainWiseData.length; j++) {
        promises.push(
          setTokenConfig(
            [
              [
                {
                  tokenSymbol: token.symbol,
                  decimal: chainWiseData[i][1].decimal,
                  chainId: chainWiseData[i][0],
                  tokenAddress: chainWiseData[i][1].address,
                },
                {
                  tokenSymbol: token.symbol,
                  decimal: chainWiseData[j][1].decimal,
                  chainId: chainWiseData[j][0],
                  tokenAddress: chainWiseData[j][1].address,
                },
              ],
            ],
            backendConfig
          )
        );
      }
    }
  }
  await Promise.all(promises);
})();
