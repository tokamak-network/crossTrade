// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.24;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { L2toL2CrossTradeStorageV2TRH } from "./L2toL2CrossTradeStorageV2TRH.sol";
import { IOptimismMintableERC20, ILegacyMintableERC20 } from "../interfaces/IOptimismMintableERC20.sol";
import { IL2CrossDomainMessenger } from "../interfaces/IL2CrossDomainMessenger.sol";
import { ReentrancyGuard } from "../utils/ReentrancyGuard.sol";

contract L2toL2CrossTradeL2V2TRH is ProxyStorage, AccessibleCommon, L2toL2CrossTradeStorageV2TRH, ReentrancyGuard {

    using SafeERC20 for IERC20;

    event RequestCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        address _registrar,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
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
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
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
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    );
    
    event CancelCT(
        address _requester,
        uint256 _totalAmount,
        uint256 indexed _saleCount,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    );

    event EditCT(
        address _requester,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    );

    //=======modifier========

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "CT: Function can only be called from an EOA");
        _;
    }

    modifier checkL1(uint256 _chainId) {
        require(
            msg.sender == address(crossDomainMessenger) && 
            IL2CrossDomainMessenger(crossDomainMessenger).xDomainMessageSender() == chainData[_chainId].l1CrossTradeContract, 
            "CT: Only callable from L1 CrossTrade contract"
        );
        _;
    }

    modifier providerCheck(uint256 _saleCount) {
        require(dealData[_saleCount].provider == address(0), "CT: Request already processed");
        _;
    }

    modifier nonZero(uint256 _amount) {
        require(_amount > 0, "CT: Amount must be greater than zero");
        _;
    }

    //=======external========

    /// @notice Register L1token and L2token and use them in requestRegisteredToken
    /// @param _l1token L1 token address
    /// @param _l2SourceToken L2 source token address
    /// @param _l2DestinationToken L2 destination token address
    /// @param _l1ChainId ChainId of L1 token
    /// @param _l2SourceChainId ChainId of L2 source
    /// @param _l2DestinationChainId ChainId of L2 destination
    function registerToken(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId
    )
        external
    {
        bytes32 id = keccak256(abi.encode(
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            _l1token,
            _l2SourceToken,
            _l2DestinationToken
        ));
        require(registerCheck[msg.sender][_l2DestinationChainId][id] == false, "CT: Token already registered");
        registerCheck[msg.sender][_l2DestinationChainId][id] = true;
    }
    
    /// @notice Delete a previously registered token configuration
    /// @param _l1token L1 token address
    /// @param _l2SourceToken L2 source token address
    /// @param _l2DestinationToken L2 destination token address
    /// @param _l1ChainId ChainId of L1 token
    /// @param _l2SourceChainId ChainId of L2 source
    /// @param _l2DestinationChainId ChainId of L2 destination
    function deleteToken(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _l1ChainId,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId
    )
        external
    {
        bytes32 id = keccak256(abi.encode(
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            _l1token,
            _l2SourceToken,
            _l2DestinationToken
        ));
        require(registerCheck[msg.sender][_l2DestinationChainId][id] == true, "CT: Token not registered");
        registerCheck[msg.sender][_l2DestinationChainId][id] = false;
    }

    /// @notice Token transaction request registered in register
    /// @param _l1token L1 token address
    /// @param _l2SourceToken L2 source token address
    /// @param _l2DestinationToken L2 destination token address
    /// @param _registrar Registrar address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _l1ChainId ChainId of L1 token
    /// @param _l2DestinationChainId ChainId of L2 destination
    function requestRegisteredToken(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _registrar, 
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

        require(registerCheck[msg.sender][_l2DestinationChainId][id] == true, "CT: Token not registered");
        require(_totalAmount >= _ctAmount, "CT: Total amount must be greater than or equal to CT amount");
        
        unchecked {
            ++saleCount;
        }

        bytes32 hashValue = _request(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _totalAmount,
            _ctAmount,
            saleCount,
            _l1ChainId,
            _l2DestinationChainId
        );

        emit RequestCT(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            msg.sender,
            _registrar,
            _totalAmount,
            _ctAmount,
            saleCount,
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            hashValue
        );
    }

    /// @notice Token transaction request not registered in register
    /// @param _l1token L1 token address
    /// @param _l2SourceToken L2 source token address
    /// @param _l2DestinationToken L2 destination token address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _l1ChainId ChainId of L1 token
    /// @param _l2DestinationChainId ChainId of L2 destination
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
            ++saleCount;
        }

        bytes32 hashValue = _request(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _totalAmount,
            _ctAmount,
            saleCount,
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
            saleCount,
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            hashValue
        );
    }
    
    /// @notice When providing a function called from L1, the amount is given to the provider
    /// @param _from Provider address
    /// @param _ctAmount Amount paid by L1
    /// @param _saleCount Number generated upon request
    /// @param _l1ChainId ChainId of L1 token
    /// @param _l2DestinationChainId ChainId of L2 destination
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
        providerCheck(_saleCount)
    {
        require(dealData[_saleCount].hashValue == _hash, "CT: Hash values do not match");

        uint256 ctAmount = _ctAmount;
        if(_ctAmount == 0) {
            ctAmount = dealData[_saleCount].ctAmount;
        } 

        dealData[_saleCount].provider = _from;
        address l2SourceToken = dealData[_saleCount].l2SourceToken;
        uint256 totalAmount = dealData[_saleCount].totalAmount;

        if(l2SourceToken == legacyERC20ETH) {
            (bool sent, ) = payable(_from).call{value: totalAmount}("");
            require(sent, "CT: ETH transfer failed");
        } else {
            IERC20(l2SourceToken).safeTransfer(_from, totalAmount);
        }

        uint256 _l2SourceChainId = _getChainID();

        emit ProviderClaimCT(
            dealData[_saleCount].l1token,
            l2SourceToken,
            dealData[_saleCount].l2DestinationToken,
            dealData[_saleCount].requester,
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

    /// @notice When canceling a function called from L1, the amount is given to the requester
    /// @param _msgSender Address where cancellation was requested
    /// @param _salecount Number generated upon request
    /// @param _l1ChainId ChainId of L1 token
    /// @param _l2DestinationChainId ChainId of L2 destination
    /// @param _hash Hash value generated upon request
    function cancelCT(
        address _msgSender,
        uint256 _salecount,
        uint256 _l1ChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    )
        external
        nonReentrant
        checkL1(_l1ChainId)
        providerCheck(_salecount)
    {
        require(dealData[_salecount].requester == _msgSender, "CT: Not the seller");
        require(dealData[_salecount].hashValue == _hash, "CT: Hash values do not match");

        dealData[_salecount].provider = _msgSender;
        uint256 totalAmount = dealData[_salecount].totalAmount;
        
        if (dealData[_salecount].l2SourceToken == legacyERC20ETH) {
            (bool sent, ) = payable(_msgSender).call{value: totalAmount}("");
            require(sent, "CT: ETH refund failed");
        } else {
            IERC20(dealData[_salecount].l2SourceToken).safeTransfer(_msgSender, totalAmount);
        }

        uint256 _l2SourceChainId = _getChainID();

        emit CancelCT(
            _msgSender, 
            totalAmount, 
            _salecount,
            _l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId,
            _hash
        );
    }

    /// @notice Function that calculates hash value in L2CrossTradeContract
    /// @param _l1token L1 token address
    /// @param _l2SourceToken L2 source token address
    /// @param _l2DestinationToken L2 destination token address
    /// @param _requestor Requester's address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _saleCount Number generated upon request
    /// @param _l1ChainId Destination chainID
    /// @param _l2SourceChainId The chainId where this contract was deployed
    /// @param _l2DestinationChainId The destination chain ID
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

    //=======internal========

    /// @notice Get the current chain ID
    function _getChainID() private view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    /// @notice Token transaction request
    /// @param _l1token L1 token address
    /// @param _l2SourceToken L2 source token address
    /// @param _l2DestinationToken L2 destination token address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _saleCount Number generated upon request
    /// @param l1ChainId ChainId of L1 token
    /// @param l2DestinationChainId ChainId of L2 destination
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
        if (_l2SourceToken == legacyERC20ETH) {
            require(msg.value == _totalAmount, "CT: Native token amount must match total amount");
        } else {
            IERC20(_l2SourceToken).safeTransferFrom(msg.sender, address(this), _totalAmount);
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

        dealData[_saleCount] = RequestData({
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

        return hashValue;
    }
}