// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.24;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { L2toL2CrossTradeStorage } from "./L2toL2CrossTradeStorage.sol";
// import { IOptimismMintableERC20, ILegacyMintableERC20 } from "../interfaces/IOptimismMintableERC20.sol";
import { IL2CrossDomainMessenger } from "../interfaces/IL2CrossDomainMessenger.sol";
import { ReentrancyGuard } from "../utils/ReentrancyGuard.sol";

// import "hardhat/console.sol";

contract L2toL2CrossTradeL2 is ProxyStorage, AccessibleCommon, L2toL2CrossTradeStorage, ReentrancyGuard {

    using SafeERC20 for IERC20;

    event RequestCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l1ChainId,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hashValue
    );

    event NonRequestCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l1ChainId,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hashValue
    );

    event ProviderClaimCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        address _provider,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l1ChainId,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hash
    );
    
    event CancelCT(
        address _requester,
        uint256 _totalAmount,
        uint256 indexed _saleCount,
        uint256 _l1ChainId,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hash
    );

    event RegisterToken(
        address indexed _l1token,
        address indexed _l2SourceToken,
        address indexed _l2DestinationToken,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId
    );

    event DeleteToken(
        address indexed _l1token,
        address indexed _l2SourceToken,
        address indexed _l2DestinationToken,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId
    );

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "L2FW: function can only be called from an EOA");
        _;
    }

    modifier checkL1(uint256 _chainId) {
        require(
            msg.sender == address(crossDomainMessenger) && IL2CrossDomainMessenger(crossDomainMessenger).xDomainMessageSender() == l1CrossTradeContract[_chainId], 
            "only call l1FastWithdraw"
        );
        _;
    }

    modifier providerCheck(uint256 _saleCount, uint256 _l2ChainId) {
        require(dealData[_l2ChainId][_saleCount].provider == address(0), "already sold");
        _;
    }

    modifier nonZero(uint256 _amount) {
        require(_amount > 0 , "input amount need nonZero");
        _;
    }

    /// @notice Register L1token and L2token and use them in requestRegisteredToken
    /// @param _l1token l1token Address
    /// @param _l2SourceToken _l2SourceToken Address
    /// @param _l2DestinationToken _l2DestinationToken Address
    /// @param _l1ChainId chainId of l1token
    /// @param _l2SourceChainId chainId of l2Source
    /// @param _l2DestinationChainId chainId of l2Destination
    function registerToken(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId

    )
        external
        onlyOwner
    {
        bytes32 id = keccak256(abi.encode(
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            _l1token,
            _l2SourceToken,
            _l2DestinationToken
        ));
        require(registerCheck[id] == false, "already registerToken");
        registerCheck[id] = true;

        emit RegisterToken(_l1token, _l2SourceToken, _l2DestinationToken, _l1ChainId, _l2SourceChainId, _l2DestinationChainId);

    }
    
    /// @notice Register L1token and L2token and use them in requestRegisteredToken
    /// @param _l1token l1token Address
    /// @param _l2SourceToken _l2SourceToken Address
    /// @param _l2DestinationToken _l2DestinationToken Address
    /// @param _l1ChainId chainId of l1token
    /// @param _l2SourceChainId chainId of l2Source
    /// @param _l2DestinationChainId chainId of l2Destination
    function deleteToken(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId
    )
        external
        onlyOwner
    {
        bytes32 id = keccak256(abi.encode(
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            _l1token,
            _l2SourceToken,
            _l2DestinationToken
        ));
        require(registerCheck[id] != false, "already deleteToken");
        registerCheck[id] = false;
        emit DeleteToken(_l1token, _l2SourceToken, _l2DestinationToken, _l1ChainId, _l2SourceChainId, _l2DestinationChainId);
    }

    /// @notice Token transaction request registered in register
    /// @param _l1token l1token Address
    /// @param _l2SourceToken _l2SourceToken Address
    /// @param _l2DestinationToken _l2DestinationToken Address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _l1ChainId chainId of l1token
    /// @param _l2DestinationChainId chainId of l2DestinationToken
    function requestRegisteredToken(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _l1ChainId,
        uint256 _l2DestinationChainId
    )
        external
        payable
        onlyEOA
        nonZero(_totalAmount)
        nonZero(_ctAmount)
        nonReentrant
    {

        uint256 _l2SourceChainId = _getChainID();
        bytes32 id = keccak256(abi.encode(
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            _l1token,
            _l2SourceToken,
            _l2DestinationToken
        ));

        require(registerCheck[id] == true, "not register token");
        require(_totalAmount >= _ctAmount, "The totalAmount value must be greater than ctAmount");
        
        unchecked {
            ++saleCountChainId[_l2DestinationChainId];
        }

        bytes32 hashValue = _request(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _totalAmount,
            _ctAmount,
            saleCountChainId[_l2DestinationChainId],
            _l1ChainId,
            _l2DestinationChainId
        );


        emit RequestCT(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            msg.sender,
            _totalAmount,
            _ctAmount,
            saleCountChainId[_l2DestinationChainId],
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            hashValue
        );
    }

    /// @notice Token transaction request not registered in register
    /// @param _l1token l1token Address
    /// @param _l2SourceToken _l2SourceToken Address
    /// @param _l2DestinationToken _l2DestinationToken Address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _l1ChainId chainId of l1token
    /// @param _l2DestinationChainId chainId of l2DestinationToken
    function requestNonRegisteredToken(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _l1ChainId,
        uint256 _l2DestinationChainId
    )
        external
        payable
        onlyEOA
        nonZero(_totalAmount)
        nonZero(_ctAmount)
        nonReentrant
    {     

        uint256 _l2SourceChainId = _getChainID();
        unchecked {
            ++saleCountChainId[_l2DestinationChainId];
        }

        bytes32 hashValue = _request(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _totalAmount,
            _ctAmount,
            saleCountChainId[_l2DestinationChainId],
            _l1ChainId,
            _l2DestinationChainId
        );

        emit NonRequestCT(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            msg.sender,
            _totalAmount,
            _ctAmount,
            saleCountChainId[_l2DestinationChainId],
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            hashValue
        );

    }
    
    /// @notice When providing a function called from L1, the amount is given to the provider.
    /// @param _from provider Address
    /// @param _ctAmount Amount paid by L1
    /// @param _saleCount Number generated upon request
    /// @param _l1ChainId chainId of l1token
    /// @param _l2DestinationChainId chainId of l2Destination
    /// @param _hash Hash value generated upon request
    function claimCT(
        address _from,
        uint256 _ctAmount,
        uint256 _saleCount,
        uint256 _l1ChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    )
        external
        nonReentrant
        checkL1(_l1ChainId)
        providerCheck(_saleCount, _l2DestinationChainId)
    {
        require(dealData[_l2DestinationChainId][_saleCount].hashValue == _hash, "Hash values do not match");

        uint256 ctAmount = _ctAmount;
        if(_ctAmount == 0) {
            ctAmount = dealData[_l2DestinationChainId][_saleCount].ctAmount;
        } 

        dealData[_l2DestinationChainId][_saleCount].provider = _from;
        address l2SourceToken = dealData[_l2DestinationChainId][_saleCount].l2SourceToken;
        uint256 totalAmount = dealData[_l2DestinationChainId][_saleCount].totalAmount;

        if(l2SourceToken == nativeToken) {
            (bool sent, ) = payable(_from).call{value: totalAmount}("");
            require(sent, "claim fail");
        } else {
            IERC20(l2SourceToken).safeTransfer(_from,totalAmount);
        }

        uint256 _l2SourceChainId = _getChainID();

        emit ProviderClaimCT(
            dealData[_l2DestinationChainId][_saleCount].l1token,
            l2SourceToken,
            dealData[_l2DestinationChainId][_saleCount].l2DestinationToken,
            dealData[_l2DestinationChainId][_saleCount].requester,
            _from,
            totalAmount,
            ctAmount,
            _saleCount,
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            _hash
        );
    }

    /// @notice When canceling a function called from L1, the amount is given to the requester.
    /// @param _msgSender Address where cancellation was requested
    /// @param _saleCount Number generated upon request
    /// @param _l1ChainId chainId of l1token
    /// @param _l2DestinationChainId chainId of l2Destination
    /// @param _hash Hash value generated upon request
    function cancelCT(
        address _msgSender,
        uint256 _saleCount,
        uint256 _l1ChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    )
        external
        nonReentrant
        checkL1(_l1ChainId)
        providerCheck(_saleCount, _l2DestinationChainId)
    {
        require(dealData[_l2DestinationChainId][_saleCount].requester == _msgSender, "your not seller");
        require(dealData[_l2DestinationChainId][_saleCount].hashValue == _hash, "Hash values do not match");

        dealData[_l2DestinationChainId][_saleCount].provider = _msgSender;
        uint256 totalAmount = dealData[_l2DestinationChainId][_saleCount].totalAmount;
        
        if (dealData[_l2DestinationChainId][_saleCount].l2SourceToken == nativeToken) {
            (bool sent, ) = payable(_msgSender).call{value: totalAmount}("");
            require(sent, "cancel refund fail");
        } else {
            IERC20(dealData[_l2DestinationChainId][_saleCount].l2SourceToken).safeTransfer(_msgSender,totalAmount);
        }

        uint256 _l2SourceChainId = _getChainID();

        emit CancelCT(
            _msgSender, 
            totalAmount, 
            _saleCount,
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            _hash
        );

    }


    /// @notice Function that calculates hash value in L2CrossTradeContract
    /// @param _l1token l1token Address
    /// @param _l2SourceToken l2SourceToken Address
    /// @param _l2DestinationToken l2DestinationToken Address
    /// @param _requestor requester's address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount provided to L2
    /// @param _saleCount Number generated upon request
    /// @param _l1ChainId Destination chainID
    /// @param _l2SourceChainId The chainId where this contract was deployed
    /// @param _l2DestinationChainId The chainId where this contract was deployed
    function getHash(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requestor,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _saleCount,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId
    )
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                _l1token, 
                _l2SourceToken,
                _l2DestinationToken,
                _requestor, 
                _totalAmount, 
                _ctAmount, 
                _saleCount, 
                _l1ChainId,
                _l2SourceChainId,
                _l2DestinationChainId
            )
        );
    }

    /// @notice Function to calculate l1token, l2token register hash value
    function _getChainID() private view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    /// @notice Token transaction request
    /// @param _l1token l1token Address
    /// @param _l2SourceToken l2SourceToken Address
    /// @param _l2DestinationToken l2DestinationToken Address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _saleCount Number generated upon request
    /// @param l1ChainId chainId of l1token
    /// @param l2DestinationChainId chainId of l2DestinationToken

    function _request(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _saleCount,
        uint256 l1ChainId,
        uint256 l2DestinationChainId
    )
        private
        returns (bytes32 hashValue)
    {   
        if (_l2SourceToken == nativeToken) {
            require(msg.value == _totalAmount, "CT: nativeToken need amount");
        } else {
            IERC20(_l2SourceToken).safeTransferFrom(msg.sender,address(this),_totalAmount);
        }

        uint256 l2SourceChainId = _getChainID();

        hashValue = getHash(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            msg.sender,
            _totalAmount,
            _ctAmount,
            _saleCount,
            l1ChainId,
            l2SourceChainId,
            l2DestinationChainId
        );

        dealData[l2DestinationChainId][_saleCount] = RequestData({
            l1token: _l1token,
            l2SourceToken: _l2SourceToken,
            l2DestinationToken: _l2DestinationToken,
            requester: msg.sender,
            provider: address(0),
            totalAmount: _totalAmount,
            ctAmount: _ctAmount,
            l1ChainId: l1ChainId,
            l2DestinationChainId: l2DestinationChainId,
            hashValue: hashValue
        });

    }

}

