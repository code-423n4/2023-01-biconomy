import { setConfig } from "../set-deposit-config";
import { getBackendConfig } from "../utils";

(async () => {
  let deposit_config = [
    {
      chainId: 1,
      depositConfig: {
        toChainIds: [42161,42161,42161],
        tokenAddresses: [
          "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
          "0xf17e65822b568b3903685a7c9f496cf7656cc6c2"  // BICO
        ],
        tokenConfigs: [
          {
            min: "10000000",
            max: "200000000000",
          },
          {
            min: "20000000000000000",
            max: "135000000000000000000",
          },
          {
            min: "10000000000000000000",
            max: "500000000000000000000000",
          },
        ],
      },
    },
    {
      chainId: 137,
      depositConfig: {
        toChainIds: [42161,42161,42161],
        tokenAddresses: [
          "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
          "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", // ETH
          "0x91c89A94567980f0e9723b487b0beD586eE96aa7"  // BICO
        ],
        tokenConfigs: [
          {
            min: "10000000",
            max: "200000000000",
          },
          {
            min: "20000000000000000",
            max: "135000000000000000000",
          },
          {
            min: "10000000000000000000",
            max: "500000000000000000000000",
          },
        ],
      },
    },
    {
      chainId: 43114,
      depositConfig: {
        toChainIds: [42161,42161],
        tokenAddresses: [
          "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664", // USDC
          "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab", // ETH
        ],
        tokenConfigs: [
          {
            min: "10000000",
            max: "200000000000",
          },
          {
            min: "20000000000000000",
            max: "135000000000000000000",
          }
        ],
      },
    },
    {
      chainId: 56,
      depositConfig: {
        toChainIds: [42161,42161,42161],
        tokenAddresses: [
          "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // USDC
          "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", // ETH
          "0x06250a4962558F0F3E69FC07F4c67BB9c9eAc739"  // BICO
        ],
        tokenConfigs: [
          {
            min: "10000000000000000000",
            max: "200000000000000000000000",
          },
          {
            min: "20000000000000000",
            max: "135000000000000000000",
          },
          {
            min: "10000000000000000000",
            max: "500000000000000000000000",
          },
        ],
      },
    },
    {
      chainId: 10,
      depositConfig: {
        toChainIds: [42161,42161,42161],
        tokenAddresses: [
          "0x7f5c764cbc14f9669b88837ca1490cca17c31607", // USDC
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
          "0xd6909e9e702024eb93312b989ee46794c0fb1c9d"  // BICO
        ],
        tokenConfigs: [
          {
            min: "10000000000000000000",
            max: "200000000000000000000000",
          },
          {
            min: "20000000000000000",
            max: "135000000000000000000",
          },
          {
            min: "10000000000000000000",
            max: "500000000000000000000000",
          },
        ],
      },
    }
  ];

  setConfig(deposit_config, getBackendConfig("prod"));
})();
