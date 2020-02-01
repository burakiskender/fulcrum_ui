import { BigNumber } from "@0x/utils";
import { CTokenContract } from "../contracts/CToken";
import { Asset } from "./Asset";

export interface RefinanceData {
  collateralType: string;
  collateralAmount: BigNumber;
  debt: BigNumber;
  cdpId: BigNumber;
  accountAddress: string;
  proxyAddress: string;
  isProxy: boolean;
  isInstaProxy: boolean;
  isDisabled: boolean;
  isShowCard: boolean;
  variableAPR: BigNumber;
}

export interface RefinanceCdpData {
  cdpId: BigNumber;
  urn: string;
  ilk: string;
  accountAddress: string;
  isProxy: boolean;
  isInstaProxy: boolean;
  proxyAddress: string;
}

export interface IRefinanceToken {
  asset: Asset;
  rate: BigNumber;
  balance: BigNumber;
  usdValue: BigNumber;
  market: number | string;
  contract?: CTokenContract;
  decimals: number;
  maintenanceMarginAmount?: BigNumber;
}

export interface IRefinanceLoan extends IRefinanceToken {
  isHealthy: boolean;
  collateral: IRefinanceCollateral[];
  isDisabled: boolean;
  apr: BigNumber;
  ratio: BigNumber;
}

export interface IRefinanceCollateral extends IRefinanceToken {
  amount: BigNumber;
  borrowAmount: BigNumber;
}
