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
        
        if (editFwAmount[l2HashValue] > 0) {
            require(editFwAmount[l2HashValue] == _fwAmount, "check edit fwAmount");
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            1,
            msg.sender,
            _fwAmount,
            _salecount,
            l2HashValue
        );
        
        successCT[l2HashValue] = true;
        provideAccount[l2HashValue] = msg.sender;
        
        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );

         if (chainData[_l2chainId].nativeL1token == _l1token) {
            //need to approve
            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), _fwAmount);
            IERC20(_l1token).safeTransfer(_to,_fwAmount);
        } else if (chainData[_l2chainId].legacyERC20ETH == _l1token) {
            require(msg.value == _fwAmount, "FW: ETH need same amount");
            (bool sent, ) = payable(_to).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            //need to approve
            IERC20(_l1token).safeTransferFrom(msg.sender, _to, _fwAmount);
        }

    }

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
        
        if (editFwAmount[l2HashValue] > 0) {
            require(editFwAmount[l2HashValue] == _fwAmount, "check edit fwAmount");
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            1,
            msg.sender,
            _fwAmount,
            _salecount,
            l2HashValue
        );
        
        successCT[l2HashValue] = true;
        provideAccount[l2HashValue] = msg.sender;

        if (chainData[_l2chainId].nativeL1token == _l1token) {
            //need to approve
            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), _fwAmount);
            IERC20(_l1token).safeTransfer(_to,_fwAmount);
        } else if (chainData[_l2chainId].legacyERC20ETH == _l1token) {
            require(msg.value == _fwAmount, "FW: ETH need same amount");
            (bool sent, ) = payable(_to).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            //need to approve
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
        require(provideAccount[l2HashValue] == msg.sender, "not provider");

        bytes memory message;

        message = makeEncodeWithSignature(
            1,
            msg.sender,
            _fwAmount,
            _salecount,
            l2HashValue
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

        bytes memory message;

        message = makeEncodeWithSignature(
            2,
            msg.sender,
            _salecount,
            0,
            _hash
        );

        successCT[l2HashValue] = true;

        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );

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
        uint256 amount2,
        bytes32 byteValue
    )
        public
        pure
        returns (bytes memory)
    {
        if (number == 1) {
            return abi.encodeWithSignature("claimCT(address,uint256,uint256,bytes32)", 
                to, 
                amount,
                amount2,
                byteValue
            );
        } else if (number == 2) {
            return abi.encodeWithSignature("cancelCT(address,uint256)", 
                to,
                amount
            );
        }
    }

    function _getChainID() public view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }


}