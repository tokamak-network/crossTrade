// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { L2CrossTradeStorage } from "./L2CrossTradeStorage.sol";
import { IOptimismMintableERC20, ILegacyMintableERC20 } from "../interfaces/IOptimismMintableERC20.sol";
import { IL2CrossDomainMessenger } from "../interfaces/IL2CrossDomainMessenger.sol";
import { ReentrancyGuard } from "../utils/ReentrancyGuard.sol";

// import "hardhat/console.sol";

contract L2CrossTrade is ProxyStorage, AccessibleCommon, L2CrossTradeStorage, ReentrancyGuard {

    using SafeERC20 for IERC20;

    event CreateRequestCT(
        address _l1token,
        address _l2token,
        address _requester,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        bytes32 _hashValue
    );

    event ProviderClaimCT(
        address _l1token,
        address _l2token,
        address _requester,
        address _provider,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount
    );

    event CancelCT(
        address _requester,
        uint256 _totalAmount,
        uint256 indexed _saleCount
    );

    event EditCT(
        address _requester,
        uint256 _ctAmount,
        uint256 indexed _saleCount
    );

    //=======modifier========

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "L2FW: function can only be called from an EOA");
        _;
    }

    modifier checkL1(uint256 _chainId) {
        require(
            msg.sender == address(crossDomainMessenger) && IL2CrossDomainMessenger(crossDomainMessenger).xDomainMessageSender() == chainData[_chainId].l1CrossTradeContract, 
            "only call l1FastWithdraw"
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

    modifier nonZeroAddr(address _addr) {
        require(_addr != address(0) , "nonZeroAddr");
        _;
    }

    //=======external========

    /// @notice Register L1token and L2token and use them in requestRegisteredToken
    /// @param _l1token l1token Address
    /// @param _l2token l2token Address
    /// @param _l1chainId chainId of l1token
    function registerToken(
        address _l1token,
        address _l2token,
        uint256 _l1chainId
    )
        external
        onlyOwner
    {
        require(registerCheck[_l1chainId][_l1token][_l2token] == false, "already registerToken");
        // enteringToken[_l1chainId][_l2token] = _l1token;
        registerCheck[_l1chainId][_l1token][_l2token] = true;
    }
    
    /// @notice Function to delete registered token
    /// @param _l1token l1token Address
    /// @param _l2token l2token Address
    /// @param _l1chainId chainId of l1token
    function deleteToken(
        address _l1token,
        address _l2token,
        uint256 _l1chainId
    )
        external
        onlyOwner
    {
        require(registerCheck[_l1chainId][_l1token][_l2token] != false, "already deleteToken");
        // enteringToken[_l1chainId][_l2token] = address(0);
        registerCheck[_l1chainId][_l1token][_l2token] = false;
    }

    /// @notice Token transaction request registered in register
    /// @param _l1token l1token Address
    /// @param _l2token l2token Address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _l1chainId chainId of l1token
    function requestRegisteredToken(
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
        nonReentrant
    {
        // address _l1token = enteringToken[_l1chainId][_l2token];
        require(registerCheck[_l1chainId][_l1token][_l2token] == true, "not register token");
        
        unchecked {
            ++saleCount;
        }

        _request(
            _l1token,
            _l2token,
            _totalAmount,
            _ctAmount,
            saleCount,
            _l1chainId
        );
    }

    /// @notice Token transaction request not registered in register
    /// @param _l1token l1token Address
    /// @param _l2token l2token Address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount to be received from L1
    /// @param _l1chainId chainId of l1token
    function requestNonRegisteredToken(
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
        nonZeroAddr(_l1token)
        nonZeroAddr(_l2token)
        nonReentrant
    {        
        unchecked {
            ++saleCount;
        }

        _request(
            _l1token,
            _l2token,
            _totalAmount,
            _ctAmount,
            saleCount,
            _l1chainId
        );
    }
    
    /// @notice When providing a function called from L1, the amount is given to the provider.
    /// @param _from provider Address
    /// @param _ctAmount Amount paid by L1
    /// @param _saleCount Number generated upon request
    /// @param _chainId chainId of l1token
    /// @param _hash Hash value generated upon request
    function claimCT(
        address _from,
        uint256 _ctAmount,
        uint256 _saleCount,
        uint256 _chainId,
        bytes32 _hash
    )
        external
        nonReentrant
        checkL1(_chainId)
        providerCheck(_saleCount)
    {
        require(dealData[_saleCount].hashValue == _hash, "Hash values do not match");

        uint256 ctAmount;
        if(_ctAmount == 0) {
            ctAmount = dealData[_saleCount].ctAmount;
        } else {
            ctAmount = _ctAmount;
        }

        dealData[_saleCount].provider = _from;
        address l2token = dealData[_saleCount].l2token;
        uint256 totalAmount = dealData[_saleCount].totalAmount;

        if(l2token == legacyERC20ETH) {
            (bool sent, ) = payable(_from).call{value: totalAmount}("");
            require(sent, "claim fail");
        } else {
            IERC20(l2token).safeTransfer(_from,totalAmount);
        }

        emit ProviderClaimCT(
            dealData[_saleCount].l1token,
            l2token,
            dealData[_saleCount].requester,
            _from,
            totalAmount,
            ctAmount,
            _saleCount
        );
    }
    
    /// @notice When canceling a function called from L1, the amount is given to the requester.
    /// @param _msgSender Address where cancellation was requested
    /// @param _salecount Number generated upon request
    /// @param _chainId chainId of l1token
    function cancelCT(
        address _msgSender,
        uint256 _salecount,
        uint256 _chainId
    )
        external
        nonReentrant
        checkL1(_chainId)
        providerCheck(_salecount)
    {
        require(dealData[_salecount].requester == _msgSender, "your not seller");

        dealData[_salecount].provider = _msgSender;
        uint256 totalAmount = dealData[_salecount].totalAmount;
        
        if (dealData[_salecount].l2token == legacyERC20ETH) {
            (bool sent, ) = payable(_msgSender).call{value: totalAmount}("");
            require(sent, "cancel refund fail");
        } else {
            IERC20(dealData[_salecount].l2token).safeTransfer(_msgSender,totalAmount);
        }

        emit CancelCT(
            _msgSender, 
            totalAmount, 
            _salecount
        );
    }


    /// @notice Function that calculates hash value in L2CrossTradeContract
    /// @param _l1token l1token Address
    /// @param _l2token l2token Address
    /// @param _requestor requester's address
    /// @param _totalAmount Amount provided to L2
    /// @param _ctAmount Amount provided to L2
    /// @param _saleCount Number generated upon request
    /// @param _l1chainId chainId of l1token
    function getHash(
        address _l1token,
        address _l2token,
        address _requestor,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _saleCount,
        uint256 _l1chainId
    )
        public
        view
        returns (bytes32)
    {
        uint256 l2chainId = _getChainID();
        return keccak256(
            abi.encode(
                _l1token, 
                _l2token, 
                _requestor, 
                _totalAmount, 
                _ctAmount, 
                _saleCount, 
                _l1chainId, 
                l2chainId
            )
        );
    }

    //=======Temporary view for testing ========
    function getChainID() public view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    //=======internal========

    /// @notice Function to calculate l1token, l2token register hash value
    function _getChainID() internal view returns (uint256 id) {
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
    /// @param _l1chainId chainId of l1token
    function _request(
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _saleCount,
        uint256 _l1chainId
    )
        internal
    {
        if (_l2token == legacyERC20ETH) {
            require(msg.value == _totalAmount, "CT: nativeTON need amount");
        } else {
            IERC20(_l2token).safeTransferFrom(msg.sender,address(this),_totalAmount);
        }

        bytes32 hashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _ctAmount,
            _saleCount,
            _l1chainId
        );

        dealData[_saleCount] = RequestData({
            l1token: _l1token,
            l2token: _l2token,
            requester: msg.sender,
            provider: address(0),
            totalAmount: _totalAmount,
            ctAmount: _ctAmount,
            chainId: _l1chainId,
            hashValue: hashValue
        });

        emit CreateRequestCT(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _ctAmount,
            _saleCount,
            hashValue
        );
    }
}