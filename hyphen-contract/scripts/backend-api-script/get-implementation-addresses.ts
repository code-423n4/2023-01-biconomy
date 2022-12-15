import { getImplementationAddress } from "../deploy/deploy-utils";
import { getContractAddresses } from "../upgrades/upgrade-all/upgrade-all";
import { getProviderMapByChain } from "../deploy/deploy-utils";

(async () => {
  const contracts = await getContractAddresses(process.env.PROD_API_URL!);
  const provider = await getProviderMapByChain();
  const result = (
    await Promise.all(
      Object.entries(contracts).map(
        async ([chainId, addresses]) =>
          await Promise.all(
            Object.entries(addresses).map(
              async ([contractName, address]) =>
                address && [
                  chainId,
                  contractName,
                  address,
                  await getImplementationAddress(address, provider[parseInt(chainId)]),
                ]
            )
          )
      )
    )
  )
    .reduce((a, b) => [...a, ...b])
    .filter(([, , , address]) => address && address != "0x00")
    .map(([chainId, contractName, address, implementationAddress]) => ({
      chainId,
      contractName,
      address,
      implementationAddress,
    }));
  console.table(result);
})();
