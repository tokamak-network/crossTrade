// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { IL1CrossDomainMessenger } from "../interfaces/IL1CrossDomainMessenger.sol";
import { L1CrossTradeStorage } from "./L1CrossTradeStorage.sol";
import { ReentrancyGuard } from "../utils/ReentrancyGuard.sol";

contract L1CrossTrade is ProxyStorage, AccessibleCommon, L1CrossTradeStorage, ReentrancyGuard {

    using SafeERC20 for IERC20;

    event EditCT(
        address _requester,
        uint256 _fwAmount,
        uint256 _saleCount
    );

    // Storage 저장 추가 (Hash mapping 값 확인과 최종 저장 확인) 
    // 초기에는 front에서 amount정보를 제대로 가져와야함
    function provideCT(
        address _l1token,
        address _l2token,
        address _to,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        payable
        nonReentrant
    {
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            _to,
            _totalAmount,
            _salecount,
            _l2chainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");
        require(cancelL1[l2HashValue] == false, "already cancel");
        
        
        bool editCheck;

        if (editFwAmount[l2HashValue] > 0) {
            require(editFwAmount[l2HashValue] == _fwAmount, "check edit fwAmount");
            editCheck = true;
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            1,
            msg.sender,
            _fwAmount,
            _salecount,
            l2HashValue,
            editCheck
        );
        
        provideAccount[l2HashValue] = msg.sender;
        successCT[l2HashValue] = true;
        
        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );

         if (chainData[_l2chainId].nativeL1token == _l1token) {
            _approve(
                msg.sender,
                _l1token,
                _fwAmount
            );
            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), _fwAmount);
            IERC20(_l1token).safeTransfer(_to,_fwAmount);
        } else if (chainData[_l2chainId].legacyERC20ETH == _l1token) {
            require(msg.value == _fwAmount, "FW: ETH need same amount");
            (bool sent, ) = payable(_to).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            _approve(
                msg.sender,
                _l1token,
                _fwAmount
            );
            IERC20(_l1token).safeTransferFrom(msg.sender, _to, _fwAmount);
        }

    }


    //reprovide 함수 테스트를 위해서 만듬
    function provideTest(
        address _l1token,
        address _l2token,
        address _to,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        payable
        nonReentrant
    {
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            _to,
            _totalAmount,
            _salecount,
            _l2chainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");
        require(cancelL1[l2HashValue] == false, "already cancel");
        
        bool editCheck;

        if (editFwAmount[l2HashValue] > 0) {
            require(editFwAmount[l2HashValue] == _fwAmount, "check edit fwAmount");
            editCheck = true;
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            1,
            msg.sender,
            _fwAmount,
            _salecount,
            l2HashValue,
            editCheck
        );
        
        successCT[l2HashValue] = true;
        provideAccount[l2HashValue] = msg.sender;

        if (chainData[_l2chainId].nativeL1token == _l1token) {
            _approve(
                msg.sender,
                _l1token,
                _fwAmount
            );
            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), _fwAmount);
            IERC20(_l1token).safeTransfer(_to,_fwAmount);
        } else if (chainData[_l2chainId].legacyERC20ETH == _l1token) {
            require(msg.value == _fwAmount, "FW: ETH need same amount");
            (bool sent, ) = payable(_to).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            _approve(
                msg.sender,
                _l1token,
                _fwAmount
            );
            IERC20(_l1token).safeTransferFrom(msg.sender, _to, _fwAmount);
        }

    }

    function reprovideCT(
        address _l1token,
        address _l2token,
        address _to,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        nonReentrant
    {
         bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            _to,
            _totalAmount,
            _salecount,
            _l2chainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == true, "not reprovide");
        require(cancelL1[l2HashValue] == false, "already cancel");

        bool editCheck;
        
        if (editFwAmount[l2HashValue] > 0) {
            require(editFwAmount[l2HashValue] == _fwAmount, "check edit fwAmount");
            editCheck = true;
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            1,
            provideAccount[l2HashValue],
            _fwAmount,
            _salecount,
            l2HashValue,
            editCheck
        );

        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );
    }

    function cancel( 
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        nonReentrant
    {
         bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _salecount,
            _l2chainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");

        bytes memory message;

        message = makeEncodeWithSignature(
            2,
            msg.sender,
            0,
            _salecount,
            _hash,
            false
        );

        cancelL1[l2HashValue] = true;

        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );

    }

    function resendCancel(

    )
        external
        nonReentrant
    {

    }
        

    function edit(
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        bytes32 _hash
    )  
        external
        payable
        nonReentrant
    {
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _salecount,
            _l2chainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");
        
        editFwAmount[l2HashValue] = _fwAmount;

        emit EditCT(
            msg.sender, 
            _fwAmount, 
            _salecount
        );
    }

    function getHash(
        address _l1token,
        address _l2token,
        address _to,
        uint256 _totalAmount,
        uint256 _saleCount,
        uint256 _l2chainId
    )
        public
        view
        returns (bytes32)
    {
        uint256 l1chainId = _getChainID();
        return keccak256(
            abi.encode(_l1token, _l2token, _to, _totalAmount, _saleCount, l1chainId, _l2chainId)
        );
    }

    function makeEncodeWithSignature(
        uint8 number,
        address to, 
        uint256 amount,
        uint256 saleCount,
        bytes32 byteValue,
        bool _edit
    )
        public
        view
        returns (bytes memory)
    {
        uint256 chainId = _getChainID();
        if (number == 1) {
            return abi.encodeWithSignature("claimCT(address,uint256,uint256,uint256,bytes32,bool)", 
                to, 
                amount,
                saleCount,
                chainId,
                byteValue,
                _edit
            );
        } else if (number == 2) {
            return abi.encodeWithSignature("cancelCT(address,uint256,uint256)", 
                to,
                saleCount,
                chainId
            );
        }
    }

    function _getChainID() public view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    function _approve(
        address _sender,
        address _l1token,
        uint256 _totalAmount
    ) internal view {
        uint256 allow = IERC20(_l1token).allowance(_sender, address(this));
        require(allow >= _totalAmount, "need approve");
    }


}