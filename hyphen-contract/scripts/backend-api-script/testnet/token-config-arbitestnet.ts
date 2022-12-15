import { setTokenConfig } from "../add-supported-token";
import { getBackendConfig } from "../utils";

(async () => {
  let tokenConfig = [
    // USDC 
    [
      {
        tokenSymbol: "USDC",
        decimal: 6,
        chainId: 5,
        tokenAddress: "0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF",
      },
      {
        tokenSymbol: "USDC",
        decimal: 6,
        chainId: 421611,
        tokenAddress: "0x31b02918d86afdb502e48958a8190e98952a9c0c",
      },
    ],
    [
      {
        tokenSymbol: "USDC",
        decimal: 6,
        chainId: 80001,
        tokenAddress: "0xdA5289fCAAF71d52a80A254da614a192b693e977",
      },
      {
        tokenSymbol: "USDC",
        decimal: 6,
        chainId: 421611,
        tokenAddress: "0x31b02918d86afdb502e48958a8190e98952a9c0c",
      },
    ],
    [
      {
        tokenSymbol: "USDC",
        decimal: 6,
        chainId: 69,
        tokenAddress: "0x4995E4dd58Fa9eF9D80F3111777fdd4bC3300a7C",
      },
      {
        tokenSymbol: "USDC",
        decimal: 6,
        chainId: 421611,
        tokenAddress: "0x31b02918d86afdb502e48958a8190e98952a9c0c",
      },
    ],

    // BICO 
    [
      {
        tokenSymbol: "BICO",
        decimal: 18,
        chainId: 5,
        tokenAddress: "0xDdc47b0cA071682e8dc373391aCA18dA0Fe28699",
      },
      {
        tokenSymbol: "BICO",
        decimal: 18,
        chainId: 421611,
        tokenAddress: "0xd8e71dedbd081e9b702c69a6afca61c07076a148",
      },
    ],
    [
      {
        tokenSymbol: "BICO",
        decimal: 18,
        chainId: 80001,
        tokenAddress: "0xac42d8319ce458b22a72b45f58c0dcfeee824691",
      },
      {
        tokenSymbol: "BICO",
        decimal: 18,
        chainId: 421611,
        tokenAddress: "0xd8e71dedbd081e9b702c69a6afca61c07076a148",
      },
    ],
    [
      {
        tokenSymbol: "BICO",
        decimal: 18,
        chainId: 69,
        tokenAddress: "0x439725d33Fe46f1C167F6116aeEd7d910E482D2E",
      },
      {
        tokenSymbol: "BICO",
        decimal: 18,
        chainId: 421611,
        tokenAddress: "0xd8e71dedbd081e9b702c69a6afca61c07076a148",
      },
    ],
    [
      {
        tokenSymbol: "BICO",
        decimal: 18,
        chainId: 97,
        tokenAddress: "0x756289346D2b3C867966899c6D0467EdEb4Da3C4",
      },
      {
        tokenSymbol: "BICO",
        decimal: 18,
        chainId: 421611,
        tokenAddress: "0xd8e71dedbd081e9b702c69a6afca61c07076a148",
      },
    ],

    // ETH 
    [
      {
        tokenSymbol: "ETH",
        decimal: 18,
        chainId: 5,
        tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
      {
        tokenSymbol: "ETH",
        decimal: 18,
        chainId: 421611,
        tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
    ],
    [
      {
        tokenSymbol: "ETH",
        decimal: 18,
        chainId: 80001,
        tokenAddress: "0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa",
      },
      {
        tokenSymbol: "ETH",
        decimal: 18,
        chainId: 421611,
        tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
    ],
    [
      {
        tokenSymbol: "ETH",
        decimal: 18,
        chainId: 43113,
        tokenAddress: "0x7fcdc2c1ef3e4a0bcc8155a558bb20a7218f2b05",
      },
      {
        tokenSymbol: "ETH",
        decimal: 18,
        chainId: 421611,
        tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
    ],
    [
      {
        tokenSymbol: "ETH",
        decimal: 18,
        chainId: 97,
        tokenAddress: "0x756289346D2b3C867966899c6D0467EdEb4Da3C4",
      },
      {
        tokenSymbol: "ETH",
        decimal: 18,
        chainId: 421611,
        tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
    ],
  ];

  setTokenConfig(tokenConfig, getBackendConfig("staging"));
})();
