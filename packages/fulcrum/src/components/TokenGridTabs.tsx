import React, { Component } from "react";
import { Asset } from "../domain/Asset";
import { AssetsDictionary } from "../domain/AssetsDictionary";
import { PositionType } from "../domain/PositionType";
import { TradeTokenKey } from "../domain/TradeTokenKey";
import { ReactComponent as WalletSvg } from "../assets/images/wallet-icon.svg";
import { IDropDownSelectOption, DropdownSelect, IDropdownSelectProps } from "./DropdownSelect";

import "../styles/components/token-grid-tabs.scss";

export interface ITokenGridTabsProps {
  selectedTabAsset: Asset;
  isMobile: boolean;
  assets: Asset[];
  isShowMyTokensOnly: boolean;
  openedPositionsCount: number;
  onTabSelect: (asset: Asset) => void;
  onShowMyTokensOnlyChange: (value: boolean) => void;
}

interface ITokenGridTabsState {
  isPro: boolean;
  isShowMyTokensOnly: boolean;
}

export class TokenGridTabs extends Component<ITokenGridTabsProps, ITokenGridTabsState> {
  constructor(props: ITokenGridTabsProps, context?: any) {
    super(props, context);
    this.state = {
      isShowMyTokensOnly: props.isShowMyTokensOnly,
      isPro: false
    };
    this.onSwitchPro = this.onSwitchPro.bind(this);
  }


  private renderAsset = (asset: Asset) => {
    const assetDetails = AssetsDictionary.assets.get(asset);
    if (!assetDetails) return;

    const isActiveClassName = asset === this.props.selectedTabAsset && !this.state.isShowMyTokensOnly
      ? "trade-token-grid-tab-item--active"
      : "";

    const classNamePrefix = "trade-token-grid-tab-item";

    return (
      <div key={`${assetDetails.displayName}`}
        className={`${classNamePrefix} ${isActiveClassName} ${asset.toLowerCase()}-tab`}
        onClick={(e) => { this.onSelectClick(e, asset) }}
      >
        <div className={`${classNamePrefix}__col-token-image`}>
          {assetDetails.reactLogoSvg.render()}
          {!this.props.isMobile ? <span >{assetDetails.displayName}</span> : null}
        </div>
      </div>
    );
  }


  private async onSelectClick(event: React.MouseEvent<HTMLElement>, asset: Asset) {
    event.stopPropagation();

    await this.setState({ ...this.state, isShowMyTokensOnly: false })
    await this.props.onShowMyTokensOnlyChange(false);
    await this.props.onTabSelect(asset);
  };

  private async onDropdownSelect(value: string) {
    if (value === "manage") {
      this.showMyTokensOnlyChange();
      return;
    }
    const asset = value as Asset;

    await this.setState({ ...this.state, isShowMyTokensOnly: false })
    await this.props.onShowMyTokensOnlyChange(false);
    await this.props.onTabSelect(asset);
  }


  public render() {
    var selectedAsset = AssetsDictionary.assets.get(this.props.selectedTabAsset);
    var displayName = !!selectedAsset ? selectedAsset.displayName : "manage";

    return (
      <div className={`trade-token-grid-tab ${displayName && !this.state.isShowMyTokensOnly ? displayName.toLowerCase() : "manage"}`} >
        <div className="trade-token-grid-tab__container">
          <div className="trade-token-grid-tab__selector">
            <DropdownSelect {...this.getDropdownProps()} />
          </div>
          <div className="trade-token-grid-tab__items">
            {this.props.assets.map(asset => (this.renderAsset(asset)))}
            <div className={`trade-token-grid-tab-item manage-tab ${this.state.isShowMyTokensOnly ? "trade-token-grid-tab-item--active" : ""}`} onClick={this.showMyTokensOnlyChange}>
              <div className={`trade-token-grid-tab-item__col-token-image`} >
                {<WalletSvg />}
                {!this.props.isMobile ? <span>Manage</span> : null}
                <span className="opened-positions-count">{this.props.openedPositionsCount}</span>
              </div>
            </div>
          </div>
          {!this.props.isMobile
            ? <React.Fragment>
              <div className="pro-switch-wrapper">
                <label className={`pro-switch ${this.state.isPro ? `active` : ``}`}>
                  <input type="checkbox" id="checkbox" onChange={this.onSwitchPro} />
                  <div className="slider round"></div>
                </label>
              </div>
            </React.Fragment>
            : null
          }
        </div>
      </div>
    )
  }

  public showMyTokensOnlyChange = async () => {
    await this.props.onShowMyTokensOnlyChange(true);
    await this.setState({ ...this.state, isShowMyTokensOnly: true })
  }

  private getDropdownProps(): IDropdownSelectProps {

    let dropDownSelectOptions: IDropDownSelectOption[] = [];
    this.props.assets.forEach(asset => dropDownSelectOptions.push({
      value: asset,
      displayName: `${asset}-DAI`
    }));

    dropDownSelectOptions.push({
      value: "manage",
      displayName: "Manage"
    });

    let activeDropDownOption = dropDownSelectOptions.find(option => this.state.isShowMyTokensOnly ? option.value === "manage" : option.value === this.props.selectedTabAsset);

    return {
      options: dropDownSelectOptions,
      selectedOption: activeDropDownOption ? activeDropDownOption : dropDownSelectOptions[0],
      onDropdownSelect: this.onDropdownSelect.bind(this)
    }
  }
  private onSwitchPro() {
    this.setState({ ...this.state, isPro: !this.state.isPro });
  }
}