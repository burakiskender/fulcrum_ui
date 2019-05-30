import { BigNumber } from "@0x/utils";
import React, { Component } from "react";
import { Asset } from "../domain/Asset";
import { AssetDetails } from "../domain/AssetDetails";
import { AssetsDictionary } from "../domain/AssetsDictionary";
import { IPriceDataPoint } from "../domain/IPriceDataPoint";
import { PositionType } from "../domain/PositionType";
import { TradeRequest } from "../domain/TradeRequest";
import { TradeTokenKey } from "../domain/TradeTokenKey";
import { TradeType } from "../domain/TradeType";
import { FulcrumProviderEvents } from "../services/events/FulcrumProviderEvents";
import { ProviderChangedEvent } from "../services/events/ProviderChangedEvent";
import { TradeTransactionMinedEvent } from "../services/events/TradeTransactionMinedEvent";
import { FulcrumProvider } from "../services/FulcrumProvider";
// import { Change24HMarker, Change24HMarkerSize } from "./Change24HMarker";
import { LeverageSelector } from "./LeverageSelector";
import { PositionTypeMarker } from "./PositionTypeMarker";

export interface ITradeTokenGridRowProps {
  selectedKey: TradeTokenKey;

  asset: Asset;
  defaultUnitOfAccount: Asset;
  positionType: PositionType;
  defaultLeverage: number;

  onSelect: (key: TradeTokenKey) => void;
  onTrade: (request: TradeRequest) => void;
}

interface ITradeTokenGridRowState {
  assetDetails: AssetDetails | null;
  leverage: number;

  latestPriceDataPoint: IPriceDataPoint;
  profit: BigNumber | null;
  balance: BigNumber;
}

export class TradeTokenGridRow extends Component<ITradeTokenGridRowProps, ITradeTokenGridRowState> {
  constructor(props: ITradeTokenGridRowProps, context?: any) {
    super(props, context);

    const assetDetails = AssetsDictionary.assets.get(props.asset);

    this.state = {
      leverage: this.props.defaultLeverage,
      assetDetails: assetDetails || null,
      latestPriceDataPoint: FulcrumProvider.Instance.getPriceDefaultDataPoint(),
      profit: new BigNumber(0),
      balance: new BigNumber(0)
    };

    FulcrumProvider.Instance.eventEmitter.on(FulcrumProviderEvents.ProviderAvailable, this.onProviderAvailable);
    FulcrumProvider.Instance.eventEmitter.on(FulcrumProviderEvents.ProviderChanged, this.onProviderChanged);
    FulcrumProvider.Instance.eventEmitter.on(FulcrumProviderEvents.TradeTransactionMined, this.onTradeTransactionMined);
  }

  private getTradeTokenGridRowSelectionKeyRaw(props: ITradeTokenGridRowProps, leverage: number = this.state.leverage) {
    return new TradeTokenKey(props.asset, props.defaultUnitOfAccount, props.positionType, leverage);
  }

  private getTradeTokenGridRowSelectionKey(leverage: number = this.state.leverage) {
    return this.getTradeTokenGridRowSelectionKeyRaw(this.props, leverage);
  }

  private async derivedUpdate() {
    const tradeTokenKey = new TradeTokenKey(this.props.asset, this.props.defaultUnitOfAccount, this.props.positionType, this.state.leverage);
    const latestPriceDataPoint = await FulcrumProvider.Instance.getPriceLatestDataPoint(tradeTokenKey);
    const profit = await FulcrumProvider.Instance.getTradeProfit(tradeTokenKey);
    const balance = await FulcrumProvider.Instance.getPositionTokenBalance(tradeTokenKey);

    this.setState({
      ...this.state,
      latestPriceDataPoint: latestPriceDataPoint,
      profit: profit,
      balance: balance
    });
  }

  private onProviderAvailable = async () => {
    await this.derivedUpdate();
  };

  private onProviderChanged = async (event: ProviderChangedEvent) => {
    await this.derivedUpdate();
  };

  private onTradeTransactionMined = async (event: TradeTransactionMinedEvent) => {
    if (event.key === this.props.selectedKey) {
      await this.derivedUpdate();
    }
  };

  public componentWillUnmount(): void {
    FulcrumProvider.Instance.eventEmitter.removeListener(FulcrumProviderEvents.ProviderAvailable, this.onProviderAvailable);
    FulcrumProvider.Instance.eventEmitter.removeListener(FulcrumProviderEvents.ProviderChanged, this.onProviderChanged);
    FulcrumProvider.Instance.eventEmitter.removeListener(FulcrumProviderEvents.TradeTransactionMined, this.onTradeTransactionMined);
  }

  public componentDidMount(): void {
    this.derivedUpdate();
  }

  public componentDidUpdate(
    prevProps: Readonly<ITradeTokenGridRowProps>,
    prevState: Readonly<ITradeTokenGridRowState>,
    snapshot?: any
  ): void {
    const currentTradeTokenKey = this.getTradeTokenGridRowSelectionKey(this.state.leverage);
    const prevTradeTokenKey = this.getTradeTokenGridRowSelectionKeyRaw(prevProps, prevState.leverage);

    if (
      prevState.leverage !== this.state.leverage ||
      (prevProps.selectedKey.toString() === prevTradeTokenKey.toString()) !==
        (this.props.selectedKey.toString() === currentTradeTokenKey.toString())
    ) {
      this.derivedUpdate();
    }
  }

  public render() {
    if (!this.state.assetDetails) {
      return null;
    }

    const tradeTokenKey = this.getTradeTokenGridRowSelectionKey(this.state.leverage);
    let bnPrice = new BigNumber(this.state.latestPriceDataPoint.price);
    let bnLiquidationPrice = new BigNumber(this.state.latestPriceDataPoint.liquidationPrice);
    if (this.props.positionType === PositionType.SHORT) {
      bnPrice = bnPrice.div(1000);
      bnLiquidationPrice = bnLiquidationPrice.div(1000);
    }

    // const bnChange24h = new BigNumber(this.state.latestPriceDataPoint.change24h);
    const isActiveClassName =
      tradeTokenKey.toString() === this.props.selectedKey.toString() ? "trade-token-grid-row--active" : "";

    return (
      <div className={`trade-token-grid-row ${isActiveClassName}`} onClick={this.onSelectClick}>
        <div
          className="trade-token-grid-row__col-token-image"
          style={{ backgroundColor: this.state.assetDetails.bgColor, borderLeftColor: this.state.assetDetails.bgColor }}
        >
          <img src={this.state.assetDetails.logoSvg} alt={this.state.assetDetails.displayName} />
        </div>
        <div className="trade-token-grid-row__col-token-name">{this.state.assetDetails.displayName}</div>
        <div className="trade-token-grid-row__col-position-type">
          <PositionTypeMarker value={this.props.positionType} />
        </div>
        <div className="trade-token-grid-row__col-leverage">
          <LeverageSelector
            value={this.state.leverage}
            minValue={this.props.positionType === PositionType.SHORT ? 1 : 2}
            maxValue={4}
            onChange={this.onLeverageSelect}
          />
        </div>
        <div className="trade-token-grid-row__col-price">{`$${bnPrice.toFixed(2)}`}</div>
        <div className="trade-token-grid-row__col-price">{`$${bnLiquidationPrice.toFixed(2)}`}</div>
        {/*<div className="trade-token-grid-row__col-change24h">
          <Change24HMarker value={bnChange24h} size={Change24HMarkerSize.MEDIUM} />
        </div>*/}
        <div className="trade-token-grid-row__col-profit">
          {this.state.profit ? `$${this.state.profit.toFixed(4)}` : "-"}
        </div>
        {this.renderActions(this.state.balance.eq(0))}
      </div>
    );
  }

  private renderActions = (isBuyOnly: boolean) => {
    return isBuyOnly ? (
      <div className="trade-token-grid-row__col-action">
        <button className="trade-token-grid-row__buy-button trade-token-grid-row__button--size-full" onClick={this.onBuyClick}>
          {TradeType.BUY}
        </button>
      </div>
    ) : (
      <div className="trade-token-grid-row__col-action">
        <button className="trade-token-grid-row__buy-button trade-token-grid-row__button--size-half" onClick={this.onBuyClick}>
          {TradeType.BUY}
        </button>
        <button className="trade-token-grid-row__sell-button trade-token-grid-row__button--size-half" onClick={this.onSellClick}>
          {TradeType.SELL}
        </button>
      </div>
    );
  };

  public onLeverageSelect = (value: number) => {
    this.setState({ ...this.state, leverage: value });

    this.props.onSelect(this.getTradeTokenGridRowSelectionKey(value));
  };

  public onSelectClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    this.props.onSelect(this.getTradeTokenGridRowSelectionKey());
  };

  public onBuyClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    this.props.onTrade(
      new TradeRequest(
        TradeType.BUY,
        this.props.asset,
        this.props.defaultUnitOfAccount, // TODO: depends on which one they own
        Asset.ETH,
        this.props.positionType,
        this.state.leverage,
        new BigNumber(0)
      )
    );
  };

  public onSellClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    this.props.onTrade(
      new TradeRequest(
        TradeType.SELL,
        this.props.asset,
        this.props.defaultUnitOfAccount, // TODO: depends on which one they own
        this.props.selectedKey.positionType === PositionType.SHORT ? this.props.selectedKey.asset : Asset.DAI,
        this.props.positionType,
        this.state.leverage,
        new BigNumber(0)
      )
    );
  };
}