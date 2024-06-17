// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { L2CrossTradeStorage } from "./L2CrossTradeStorage.sol";
import { IOptimismMintableERC20, ILegacyMintableERC20 } from "../interfaces/IOptimismMintableERC20.sol";
import { IL2CrossDomainMessenger } from "../interfaces/IL2CrossDomainMessenger.sol";

// import "hardhat/console.sol";

contract L2CrossTrade is ProxyStorage, AccessibleCommon, L2CrossTradeStorage {

    using SafeERC20 for IERC20;

    event CreateRequestCT(
        address _l1token,
        address _l2token,
        address _requester,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _saleCount,
        bytes32 _hashValue
    );

    event ProviderClaimCT(
        address _l1token,
        address _l2token,
        address _requester,
        address _provider,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _saleCount
    );

    event CancelCT(
        address _requester,
        uint256 _totalAmount,
        uint256 _saleCount
    );

    event EditCT(
        address _requester,
        uint256 _fwAmount,
        uint256 _saleCount
    );

    //=======modifier========

    modifier onlyEOA() {
        require(!_isContract(msg.sender), "L2FW: function can only be called from an EOA");
        require(msg.sender == tx.origin, "L2FW: function can only be called from an EOA");
        _;
    }

    modifier checkL1(uint256 _chainId) {
        require(
            IL2CrossDomainMessenger(crossDomainMessenger).xDomainMessageSender() == chainData[_chainId].l1CrossTradeContract, 
            "only call l1FastWithdraw"
        );
        _;
    }

    modifier providerCheck(uint256 _saleCount) {
        require(dealData[_saleCount].provider == address(0), "already sold");
        _;
    }

    //=======external========

    function registerToken(
        address _l1token,
        address _l2token,
        uint256 _l1chainId
    )
        external
        onlyOwner
    {
        bytes32 enterHash = getEnterHash(
            _l1token,
            _l2token,
            _l1chainId
        );
        require(checkToken[enterHash] == false, "already registerToken");
        enteringToken[_l1chainId][_l2token] = _l1token;
        checkToken[enterHash] = true;
    }

    function deleteToken(
        address _l1token,
        address _l2token,
        uint256 _l1chainId
    )
        external
        onlyOwner
    {
        bytes32 enterHash = getEnterHash(
            _l1token,
            _l2token,
            _l1chainId
        );
        require(checkToken[enterHash] == true, "already deleteToken");
        checkToken[enterHash] = false;
    }

    function requestEnterToken(
        address _l2token,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _l1chainId
    )
        external
        payable
        onlyEOA
    {
        address _l1token = enteringToken[_l1chainId][_l2token];
        bytes32 enterHash = getEnterHash(
            _l1token,
            _l2token,
            _l1chainId
        );
        require(checkToken[enterHash], "not register token");
        
        unchecked {
            ++saleCount;
        }

        _request(
            _l1token,
            _l2token,
            _fwAmount,
            _totalAmount,
            saleCount,
            _l1chainId
        );
    }

    function requestCT(
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _l1chainId
    )
        external
        payable
        onlyEOA
    {
        require(_totalAmount > _fwAmount, "need totalAmount over fwAmount");
        
        unchecked {
            ++saleCount;
        }

        //L1 chainId도 넣으면 좋겠다. -> 다시 상의하기 L1 chainId
        if (_l1token == address(0)){
            _l1token = getL1token(
                _l2token,
                _l1chainId
            );
        } 

        _request(
            _l1token,
            _l2token,
            _fwAmount,
            _totalAmount,
            saleCount,
            _l1chainId
        );
    }
    
    function claimCT(
        address _from,
        uint256 _amount,
        uint256 _saleCount,
        uint256 _chainId,
        bytes32 _hash,
        bool _edit
    )
        external
        payable
        checkL1(_chainId)
        providerCheck(_saleCount)
    {
        require(dealData[_saleCount].hashValue == _hash, "Hash values do not match");
        require(dealData[_saleCount].provider == address(0), "already sold");
        if (_edit == false) {
            require(dealData[_saleCount].fwAmount == _amount, "not match the fwAmount");
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
            _amount,
            _saleCount
        );
    }

    function cancelCT(
        address _msgSender,
        uint256 _salecount,
        uint256 _chainId
    )
        external
        payable
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

    function getL1token(
        address _l2token,
        uint256 _chainId
    )
        public
        view
        returns (address l1Token) 
    {
        if (_l2token == legacyERC20ETH) {
            l1Token = chainData[_chainId].nativeL1token;
        } else {
            l1Token = ILegacyMintableERC20(_l2token).l1Token();
        }
    }

    function getHash(
        address _l1token,
        address _l2token,
        address _to,
        uint256 _totalAmount,
        uint256 _saleCount,
        uint256 _l1chainId
    )
        public
        view
        returns (bytes32)
    {
        uint256 l2chainId = _getChainID();
        //abi.encode값 어떻게 나오는지 확인
        return keccak256(
            abi.encode(_l1token, _l2token, _to, _totalAmount, _saleCount, _l1chainId, l2chainId)
        );
    }

    function getEnterHash(
        address _l1token,
        address _l2token,
        uint256 _l1chainId
    )
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encode(_l1token, _l2token, _l1chainId)
        );
    }

    //=======Temporary view for testing ========
    function getChainID() public view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    //=======internal========


    function _isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    function _getChainID() internal view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    function _approve(
        address _sender,
        address _l2token,
        uint256 _totalAmount
    ) internal view {
        uint256 allow = IERC20(_l2token).allowance(_sender, address(this));
        require(allow >= _totalAmount, "need approve");
    }

    function _request(
        address _l1token,
        address _l2token,
        uint256 _fwAmount,
        uint256 _totalAmount,
        uint256 _saleCount,
        uint256 _l1chainId
    )
        internal
    {
        if (_l2token == legacyERC20ETH) {
            require(msg.value == _totalAmount, "FW: nativeTON need amount");
        } else {
            _approve(
                msg.sender,
                _l2token,
                _totalAmount
            );
            IERC20(_l2token).safeTransferFrom(msg.sender,address(this),_totalAmount);
        }

        bytes32 hashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _saleCount,
            _l1chainId
        );

        dealData[_saleCount] = RequestData({
            l1token: _l1token,
            l2token: _l2token,
            requester: msg.sender,
            provider: address(0),
            totalAmount: _totalAmount,
            fwAmount: _fwAmount,
            chainId: _l1chainId,
            hashValue: hashValue
        });

        emit CreateRequestCT(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _fwAmount,
            _saleCount,
            hashValue
        );
    }
}