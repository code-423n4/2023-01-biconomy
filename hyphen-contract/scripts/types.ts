import {
  LiquidityPool,
  LPToken,
  WhitelistPeriodManager,
  LiquidityProviders,
  TokenManager,
  ExecutorManager,
  SvgHelperBase,
  HyphenLiquidityFarmingV2,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import type { BigNumberish, ContractFactory } from "ethers";

export interface IAddTokenParameters {
  tokenAddress: string;
  minCap: BigNumberish;
  maxCap: BigNumberish;
  depositConfigs: { chainId: number; minCap: BigNumberish; maxCap: BigNumberish }[];
  equilibriumFee: BigNumberish;
  maxFee: BigNumberish;
  transferOverhead: BigNumberish;
  maxWalletLiquidityCap: BigNumberish;
  maxLiquidityCap: BigNumberish;
  svgHelper: ContractFactory;
  decimals: number;
  rewardTokenAddress: string;
  rewardRatePerSecond: BigNumberish;
  excessStateTransferFeePer: BigNumberish;
}

export interface IContracts {
  liquidityProviders: LiquidityProviders;
  lpToken: LPToken;
  tokenManager: TokenManager;
  liquidityPool: LiquidityPool;
  whitelistPeriodManager: WhitelistPeriodManager;
  executorManager: ExecutorManager;
  liquidityFarming: HyphenLiquidityFarmingV2;
  svgHelperMap: Record<string, SvgHelperBase>;
}

export interface IContractAddresses {
  liquidityProviders?: string;
  lpToken?: string;
  tokenManager?: string;
  liquidityPool?: string;
  whitelistPeriodManager?: string;
  executorManager?: string;
  liquidityFarming?: string;
  liquidityFarmingV1?: string;
  liquidityFarmingV2?: string;
  svgHelperMap?: Record<string, string>;
}

export interface IDeployConfig {
  trustedForwarder: string;
  bicoOwner: string;
  pauser: string;
  tokens: IAddTokenParameters[];
}

export interface IBackendConfig {
  baseUrl: string;
  apiUsername: string;
  apiPassword: string;
  apiKey: string;
}
