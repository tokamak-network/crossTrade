// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "../libraries/SafeERC20.sol";

import { L2CrossTradeStorageOP } from "./L2CrossTradeStorageOP.sol";
import { IL2CrossDomainMessenger } from "../interfaces/IL2CrossDomainMessenger.sol";

// import "hardhat/console.sol";

contract L2CrossTradeOP is  L2CrossTradeStorageOP {

    using SafeERC20 for IERC20;

    event Request(
        address _l1token,
        address _l2token,
        address _requester,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l2chainId,
        bytes32 _hashValue
    );


    event ProviderClaimCT(
        address _l1token,
        address _l2token,
        address _requester,
        address _provider,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l2chainId,
        bytes32 _hash
    );
    
    event CancelCT(
        address _requester,
        uint256 _totalAmount,
        uint256 indexed _saleCount,
        uint256 _l2chainId,
        bytes32 _hash
    );

    //=======modifier========

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "L2FW: function can only be called from an EOA");
        _;
    }

    modifier checkL1() {
        require(
            msg.sender == address(crossDomainMessenger) && IL2CrossDomainMessenger(crossDomainMessenger).xDomainMessageSender() == l1CrossTradeContract, 
            "only call L1CrossTradeContract"
        );
        _;
    }

    modifier providerCheck(uint256 _saleCount) {
        require(dealData[_saleCount].provider == address(0), "already sold");
        _;
    }

    modifier nonZero(uint256 _amount) {
        require(_amount > 0 , "input amount need nonZero");
        _;
    }


   //=======external========

    function initialize(
        address _crossDomainMessenger,
        address _l1CrossTradeContract,
        address _nativeTokenL2,
        uint256 _chainId
    ) 
        external
    {   require(isInitialized == false, "Already initialized");
        crossDomainMessenger = _crossDomainMessenger;
        l1CrossTradeContract = _l1CrossTradeContract;
        nativeTokenL2 = _nativeTokenL2;
        chainIdL1 = _chainId;
        isInitialized = true;
    }



    /// @notice Token transaction request 
    ///         %% WARNING %%
    ///         We do not support ERC20, which is specially created and incurs a fee when transferring.
    /// @param _l1token l1token Address
    /// @param _l2token l2token Address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _l1chainId chainId of l1token
    function request(
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _l1chainId
    )
        external
        payable
        onlyEOA
        nonZero(_totalAmount)
        nonZero(_ctAmount)
    {
        unchecked {
            ++saleCount;
        }

        bytes32 hashValue = _request(
            _l1token,
            _l2token,
            _totalAmount,
            _ctAmount,
            saleCount,
            _l1chainId
        );

        uint256 chainId = _getChainID();

        emit Request(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _ctAmount,
            saleCount,
            chainId,
            hashValue
        );
    }

    
    /// @notice When providing a function called from L1, the amount is given to the provider.
    /// @param _from provider Address
    /// @param _ctAmount Amount paid by L1
    /// @param _saleCount Number generated upon request
    /// @param _hash Hash value generated upon request
    function claimCT(
        address _from,
        uint256 _ctAmount,
        uint256 _saleCount,
        bytes32 _hash
    )
        external
        checkL1()
        providerCheck(_saleCount)
    {
        require(dealData[_saleCount].hashValue == _hash, "Hash values do not match");

        uint256 ctAmount = _ctAmount;
        if(_ctAmount == 0) {
            ctAmount = dealData[_saleCount].ctAmount;
        } 

        dealData[_saleCount].provider = _from;
        address l2token = dealData[_saleCount].l2token;
        uint256 totalAmount = dealData[_saleCount].totalAmount;

        if(l2token == nativeTokenL2) {
            (bool sent, ) = payable(_from).call{value: totalAmount}("");
            require(sent, "claim fail");
        } else {
            IERC20(l2token).safeTransfer(_from,totalAmount);
        }

        uint256 chainId = _getChainID();

        emit ProviderClaimCT(
            dealData[_saleCount].l1token,
            l2token,
            dealData[_saleCount].requester,
            _from,
            totalAmount,
            ctAmount,
            _saleCount,
            chainId,
            _hash
        );
    }
    
    /// @notice When canceling a function called from L1, the amount is given to the requester.
    /// @param _msgSender Address where cancellation was requested
    /// @param _salecount Number generated upon request
    /// @param _hash Hash value generated upon request
    function cancelCT(
        address _msgSender,
        uint256 _salecount,
        bytes32 _hash
    )
        external
        checkL1()
        providerCheck(_salecount)
    {
        require(dealData[_salecount].requester == _msgSender, "your not seller");
        require(dealData[_salecount].hashValue == _hash, "Hash values do not match");

        dealData[_salecount].provider = _msgSender;
        uint256 totalAmount = dealData[_salecount].totalAmount;
        
        if (dealData[_salecount].l2token == nativeTokenL2) {
            (bool sent, ) = payable(_msgSender).call{value: totalAmount}("");
            require(sent, "cancel refund fail");
        } else {
            IERC20(dealData[_salecount].l2token).safeTransfer(_msgSender,totalAmount);
        }

        uint256 chainId = _getChainID();

        emit CancelCT(
            _msgSender, 
            totalAmount, 
            _salecount,
            chainId,
            _hash
        );
    }


    /// @notice Function that calculates hash value in L2CrossTradeContract
    /// @param _l1token l1token Address
    /// @param _l2token l2token Address
    /// @param _requestor requester's address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount provided to L2
    /// @param _saleCount Number generated upon request
    /// @param _startChainId The chainId where this contract was deployed
    /// @param _endChainId Destination chainID
    function getHash(
        address _l1token,
        address _l2token,
        address _requestor,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _saleCount,
        uint256 _startChainId,
        uint256 _endChainId
    )
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                _l1token, 
                _l2token, 
                _requestor, 
                _totalAmount, 
                _ctAmount, 
                _saleCount, 
                _startChainId, 
                _endChainId
            )
        );
    }

    //=======internal========

    /// @notice Function to calculate l1token, l2token register hash value
    function _getChainID() private view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    /// @notice Token transaction request
    /// @param _l1token l1token Address
    /// @param _l2token l2token Address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _saleCount Number generated upon request
    /// @param _endChainId chainId of l1token
    function _request(
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _saleCount,
        uint256 _endChainId
    )
        private
        returns (bytes32 hashValue)
    {
        if (_l2token == nativeTokenL2) {
            require(msg.value == _totalAmount, "CT: nativeTON need amount");
        } else {
            IERC20(_l2token).safeTransferFrom(msg.sender,address(this),_totalAmount);
        }

        uint256 startChainId = _getChainID();

        hashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _ctAmount,
            _saleCount,
            startChainId,
            _endChainId
        );

        dealData[_saleCount] = RequestData({
            l1token: _l1token,
            l2token: _l2token,
            requester: msg.sender,
            provider: address(0),
            totalAmount: _totalAmount,
            ctAmount: _ctAmount,
            chainId: _endChainId,
            hashValue: hashValue
        });

    }
}