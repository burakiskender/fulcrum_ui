import { BigNumber } from "@0x/utils";
import React, { ChangeEvent, Component, FormEvent } from "react";
import TagManager from 'react-gtm-module';
import { Observable, Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";
import { ActionType } from "../domain/ActionType";
import { Asset } from "../domain/Asset";
import { AssetsDictionary } from "../domain/AssetsDictionary";
import { BorrowRequest } from "../domain/BorrowRequest";
import { IBorrowEstimate } from "../domain/IBorrowEstimate";
import { WalletType } from "../domain/WalletType";
import { TorqueProvider } from "../services/TorqueProvider";
import { ActionViaTransferDetails } from "./ActionViaTransferDetails";
import { ActionViaWeb3Details } from "./ActionViaWeb3Details";
import { CollateralTokenSelectorToggle } from "./CollateralTokenSelectorToggle";

export interface IBorrowFormProps {
  borrowAsset: Asset;
  walletType: WalletType;

  didSubmit: boolean;
  toggleDidSubmit: (submit: boolean) => void;
  onSubmit?: (value: BorrowRequest) => void;
  onDecline: () => void;
}

interface IBorrowFormState {
  borrowAmount: BigNumber;
  collateralAsset: Asset;

  inputAmountText: string;
  depositAmount: BigNumber;
  gasAmountNeeded: BigNumber;
  balanceTooLow: boolean;
}

export class BorrowForm extends Component<IBorrowFormProps, IBorrowFormState> {
  private readonly _inputPrecision = 6;
  private _input: HTMLInputElement | null = null;

  private readonly _inputTextChange: Subject<string>;

  public constructor(props: IBorrowFormProps, context?: any) {
    super(props, context);

    this.state = {
      borrowAmount: new BigNumber(0),
      collateralAsset: TorqueProvider.Instance.isETHAsset(props.borrowAsset) ? Asset.DAI : Asset.ETH,
      inputAmountText: "",
      depositAmount: new BigNumber(0),
      gasAmountNeeded: new BigNumber(3000000),
      balanceTooLow: false
    };

    this._inputTextChange = new Subject<string>();
    this._inputTextChange
      .pipe(
        debounceTime(100),
        switchMap(value => this.rxConvertToBigNumber(value)),
        switchMap(value => this.rxGetEstimate(value))
      )
      .subscribe((value: IBorrowEstimate) => {
        this.setState({
          ...this.state,
          depositAmount: value.depositAmount
        });
      });
  }

  private _setInputRef = (input: HTMLInputElement) => {
    this._input = input;
  };

  public render() {
    return (
      <form className="borrow-form" onSubmit={this.onSubmit}>
        <section className="dialog-content">
          <div className="borrow-form__input-container" style={this.props.walletType === WalletType.Web3 ? { paddingBottom: `1rem` } : undefined}>
            <input
              ref={this._setInputRef}
              className="borrow-form__input-container__input-amount"
              type="text"
              onChange={this.onTradeAmountChange}
              placeholder={`Enter amount`}
            />
          </div>
          {this.props.walletType === WalletType.NonWeb3 ? (
            <div className="borrow-form__transfer-details">
              <ActionViaTransferDetails
                contractAddress={`${this.props.borrowAsset.toLowerCase()}.tokenloan.eth`}
                borrowAsset={this.props.borrowAsset}
                assetAmount={this.state.depositAmount}
                account={""}
                action={ActionType.Borrow}
              />

              {/*<div className="borrow-form-form__info-liquidated-at-container">
                <div className="borrow-form-form__info-liquidated-at-msg">
                  Your loan will be liquidated if the price of
                </div>
                <div className="borrow-form-form__info-liquidated-at-price">
                  {`ETH`} falls below ${
                    //this.state.liquidationPrice.toFixed(2)
                    `100.02`
                    }
                </div>
              </div>*/}

              <div className="borrow-form__transfer-details-msg borrow-form__transfer-details-msg--warning">
                Please send at least 2,500,000 gas with your transaction.
              </div>
              <div className="borrow-form__transfer-details-msg borrow-form__transfer-details-msg--warning">
                Always send funds from a private wallet to which you hold the private key!
              </div>
              {/*<div className="borrow-form__transfer-details-msg borrow-form__transfer-details-msg--warning">
                Note 3: If you want to partially repay loan use a web3 wallet!
              </div>*/}
              <div className="borrow-form__transfer-details-msg">
                That's it! Once you've sent the funds, click Track and enter your wallet address.
              </div>
            </div>
          ) : (
            <React.Fragment>
              <div className="borrow-form__info-collateral-by-container" style={this.state.borrowAmount.gt(0) && this.state.depositAmount.eq(0) ? { visibility: `hidden` } : undefined}>
                <div className="borrow-form__info-collateral-by-msg">To open the loan, you will deposit</div>
                <div className="borrow-form__info-collateral-by-amount">
                  {this.state.depositAmount.multipliedBy(1.005).dp(5, BigNumber.ROUND_CEIL).toString()} {this.state.collateralAsset}
                </div>
              </div>

              <div className={`borrow-form-insufficient-balance ${!this.state.balanceTooLow ? `borrow-form-insufficient-balance--hidden` : ``}`}>
                Insufficient {this.state.collateralAsset} balance in your wallet!
              </div>

              <hr className="borrow-form__delimiter" />
            </React.Fragment>
          )}
        </section>
        <section className="dialog-actions">
          <div className="borrow-form__actions-container">
            <div className="borrow-form__action-change">
              <CollateralTokenSelectorToggle
                borrowAsset={this.props.borrowAsset}
                collateralAsset={this.state.collateralAsset}
                readonly={this.props.walletType === WalletType.NonWeb3 || this.props.didSubmit}
                onChange={this.onCollateralChange}
              />
            </div>
            {this.props.walletType === WalletType.NonWeb3 ? (
              <button className="btn btn-size--small" type="submit">
                Track
              </button>
            ) : (
              <button className={`btn btn-size--small ${this.props.didSubmit ? `btn-disabled` : ``}`} type="submit">
                {this.props.didSubmit ? "Submitting..." : "Submit"}
              </button>
            )}
          </div>
        </section>
      </form>
    );
  }

  private rxConvertToBigNumber = (textValue: string): Observable<BigNumber> => {
    return new Observable<BigNumber>(observer => {
      observer.next(new BigNumber(textValue));
    });
  };

  private rxGetEstimate = (selectedValue: BigNumber): Observable<IBorrowEstimate> => {
    return new Observable<IBorrowEstimate>(observer => {
      TorqueProvider.Instance.getBorrowDepositEstimate(
        this.props.walletType,
        this.props.borrowAsset,
        this.state.collateralAsset,
        selectedValue
      ).then(value => {
        observer.next(value);
      });
    });
  };

  private onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (this.props.onSubmit && !this.props.didSubmit && this.state.depositAmount.gt(0)) {
      if (this.props.walletType === WalletType.Web3) {
        this.props.toggleDidSubmit(true);

        let assetBalance = await TorqueProvider.Instance.getAssetTokenBalanceOfUser(this.state.collateralAsset);
        if (this.state.collateralAsset === Asset.ETH) {
          assetBalance = assetBalance.gt(TorqueProvider.Instance.gasBufferForTxn) ? assetBalance.minus(TorqueProvider.Instance.gasBufferForTxn) : new BigNumber(0);
        }
        const precision = AssetsDictionary.assets.get(this.state.collateralAsset)!.decimals || 18;
        const amountInBaseUnits = new BigNumber(this.state.depositAmount.multipliedBy(10**precision).toFixed(0, 1));
        if (assetBalance.lt(amountInBaseUnits)) {
          this.props.toggleDidSubmit(false);

          this.setState({
            ...this.state,
            balanceTooLow: true
          });

          return;

        } else {
          this.setState({
            ...this.state,
            balanceTooLow: false
          });
        }
      }
      const randomNumber = Math.floor(Math.random() * 100000) + 1;
      const usdAmount = await TorqueProvider.Instance.getSwapToUsdRate(this.props.borrowAsset);
      let usdPrice = this.state.borrowAmount
      if (usdPrice !== null){
          usdPrice = usdPrice.multipliedBy(usdAmount)
      }
      const tagManagerArgs = {
        dataLayer: {
            event: 'purchase',
            transactionId: randomNumber,
            transactionTotal: new BigNumber(usdPrice),
            transactionProducts: [{
            name: "Borrow-"+this.props.borrowAsset,
            sku: "Borrow-"+this.props.borrowAsset +'-'+ this.state.collateralAsset ,
            category: "Borrow",
            price: new BigNumber(usdPrice),
            quantity: 1
          }],
        }
      }
      // console.log("tagManagerArgs = ",tagManagerArgs)
      TagManager.dataLayer(tagManagerArgs)

      this.props.onSubmit(
        new BorrowRequest(
          this.props.walletType,
          this.props.borrowAsset,
          this.state.borrowAmount,
          this.state.collateralAsset,
          this.state.depositAmount
        )
      );
    }
  };

  private onCollateralChange = async (asset: Asset) => {
    const borrowEstimate = await TorqueProvider.Instance.getBorrowDepositEstimate(
      this.props.walletType,
      this.props.borrowAsset,
      asset,
      this.state.borrowAmount
    );

    let assetBalance = await TorqueProvider.Instance.getAssetTokenBalanceOfUser(asset);
    if (asset === Asset.ETH) {
      assetBalance = assetBalance.gt(TorqueProvider.Instance.gasBufferForTxn) ? assetBalance.minus(TorqueProvider.Instance.gasBufferForTxn) : new BigNumber(0);
    }
    const precision = AssetsDictionary.assets.get(asset)!.decimals || 18;
    const amountInBaseUnits = new BigNumber(borrowEstimate.depositAmount.multipliedBy(10**precision).toFixed(0, 1));
    if (assetBalance.lt(amountInBaseUnits)) {
      this.setState({
        ...this.state,
        collateralAsset: asset,
        depositAmount: borrowEstimate.depositAmount,
        balanceTooLow: true
      });
    } else {
      this.setState({
        ...this.state,
        collateralAsset: asset,
        depositAmount: borrowEstimate.depositAmount,
        balanceTooLow: false
      });
    }
  };

  public onTradeAmountChange = async (event: ChangeEvent<HTMLInputElement>) => {
    // handling different types of empty values
    const amountText = event.target.value ? event.target.value : "";
    // console.log(amountText);
    // setting inputAmountText to update display at the same time
    this.setState({
      ...this.state,
      inputAmountText: amountText,
      borrowAmount: new BigNumber(amountText)
    }, () => {
      // emitting next event for processing with rx.js
      this._inputTextChange.next(this.state.inputAmountText);
    });
  };
}
