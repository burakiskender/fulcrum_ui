import React, { PureComponent } from "react";
import Modal from "react-modal";
import { LendForm } from "../components/LendForm";
import { LendTokenSelector } from "../components/LendTokenSelector";
import { Asset } from "../domain/Asset";
import { LendRequest } from "../domain/LendRequest";
import { LendType } from "../domain/LendType";
import { Footer } from "../layout/Footer";
import { HeaderOps } from "../layout/HeaderOps";
import { FulcrumProvider } from "../services/FulcrumProvider";
import { InfoBlock } from "../components/InfoBlock";

export interface ILendPageProps {
  doNetworkConnect: () => void;
  isRiskDisclosureModalOpen: () => void;
  isLoading: boolean;
  isMobileMedia: boolean;
}

interface ILendPageState {
  isLendModalOpen: boolean;
  lendType: LendType;
  lendAsset: Asset;
}

export class LendPage extends PureComponent<ILendPageProps, ILendPageState> {
  constructor(props: any) {
    super(props);

    this.state = { isLendModalOpen: false, lendType: LendType.LEND, lendAsset: Asset.UNKNOWN };
  }

  public componentDidMount(): void {
    const provider = FulcrumProvider.getLocalstorageItem('providerType');
    if (!FulcrumProvider.Instance.web3Wrapper && (!provider || provider === "None")) {
      this.props.doNetworkConnect();
    }
  }

  public render() {
    return (
      <div className="lend-page">
        <HeaderOps isMobileMedia={this.props.isMobileMedia} isLoading={this.props.isLoading} doNetworkConnect={this.props.doNetworkConnect} isRiskDisclosureModalOpen={this.props.isRiskDisclosureModalOpen} />
        <main className="lend-page-main">
          <InfoBlock localstorageItemProp="lend-page-info">
            Currently only our lending, unlending, and closing of position functions are enabled.  <br />
              Full functionality will return after a thorough audit of our newly implemented and preexisting smart contracts.
          </InfoBlock>
          <LendTokenSelector onLend={this.onLendRequested} />
          <Modal
            isOpen={this.state.isLendModalOpen}
            onRequestClose={this.onRequestClose}
            className="modal-content-div modal-content-div-form"
            overlayClassName="modal-overlay-div"
          >
            <LendForm
              lendType={this.state.lendType}
              asset={this.state.lendAsset}
              onSubmit={this.onLendConfirmed}
              onCancel={this.onRequestClose}
              isMobileMedia={this.props.isMobileMedia}
            />
          </Modal>
        </main>
        <Footer isMobileMedia={this.props.isMobileMedia} isRiskDisclosureModalOpen={this.props.isRiskDisclosureModalOpen} />
      </div>
    );
  }

  public onLendRequested = (request: LendRequest) => {
    if (!FulcrumProvider.Instance.contractsSource || !FulcrumProvider.Instance.contractsSource.canWrite) {
      this.props.doNetworkConnect();
      return;
    }

    if (request) {
      this.setState({
        ...this.state,
        isLendModalOpen: true,
        lendType: request.lendType,
        lendAsset: request.asset
      });
    }
  };

  public onLendConfirmed = (request: LendRequest) => {
    this.setState({
      ...this.state,
      isLendModalOpen: false,
    });
    FulcrumProvider.Instance.onLendConfirmed(request);
  };

  public onRequestClose = () => {
    this.setState({
      ...this.state,
      isLendModalOpen: false
    });
  };
}
