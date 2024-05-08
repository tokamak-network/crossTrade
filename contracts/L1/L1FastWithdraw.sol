// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { IL2FastWithdraw } from "../interfaces/IL2FastWithdraw.sol";
import { IL1CrossDomainMessenger } from "../interfaces/IL1CrossDomainMessenger.sol";
import { L1FastWithdrawStorage } from "./L1FastWithdrawStorage.sol";

contract L1FastWithdraw is ProxyStorage, AccessibleCommon, L1FastWithdrawStorage {

    using SafeERC20 for IERC20;

    // Storage 저장 추가 (Hash mapping 값 확인과 최종 저장 확인) 
    // 초기에는 front에서 amount정보를 제대로 가져와야함
    function provideFW(
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
    {
        bytes32 L2HashValue = getHash(
            _l1token,
            _l2token,
            _to,
            _totalAmount,
            _salecount,
            _l2chainId
        );
        require(L2HashValue == _hash, "Hash values do not match.");
        require(successFW[L2HashValue] == false, "already sold");
        require(block.timestamp > editEndTime[L2HashValue], "The edit reflection time must pass.");

        bytes memory message;

        message = abi.encodeWithSignature("claimFW(address,uint256,uint256,bytes32)", 
            msg.sender,
            _fwAmount,
            _salecount,
            L2HashValue
        );

        if (chainData[_l2chainId].nativeL1token == _l1token) {
            //need to approve
            IERC20(_l1token).transferFrom(msg.sender, address(this), _fwAmount);
            IERC20(_l1token).transfer(_to,_fwAmount);
        } else if (chainData[_l2chainId].legacyERC20ETH == _l1token) {
            require(msg.value == _fwAmount, "FW: ETH need same amount");
            payable(address(this)).call{value: msg.value};
            (bool sent, ) = payable(_to).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            //need to approve
            IERC20(_l1token).transferFrom(msg.sender, _to, _fwAmount);
        }
        
        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2fastWithdrawContract, 
            message, 
            _minGasLimit
        );

        successFW[L2HashValue] = true;
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
    {
         bytes32 L2HashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _salecount,
            _l2chainId
        );
        require(L2HashValue == _hash, "Hash values do not match.");

        bytes memory message;

        message = abi.encodeWithSignature("cancelFW(address,uint256)", 
            msg.sender,
            _salecount
        );

        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2fastWithdrawContract, 
            message, 
            _minGasLimit
        );

        successFW[L2HashValue] = true;
    }

    //totalAmount는 변경 불가
    //fwAmount만 변경 
    // Storage 저장 추가 (Hash mapping 값) 
    function edit(
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )  
        external
        payable
    {
        bytes32 L2HashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _salecount,
            _l2chainId
        );
        require(L2HashValue == _hash, "Hash values do not match.");

        bytes memory message;

        message = abi.encodeWithSignature("editFW(address,uint256,uint256,bytes32)", 
            msg.sender,
            _fwAmount,
            _salecount,
            _hash
        );

        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2fastWithdrawContract, 
            message, 
            _minGasLimit
        );

        editEndTime[L2HashValue] = block.timestamp + chainData[_l2chainId].editTime;
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

    function _getChainID() public view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

}