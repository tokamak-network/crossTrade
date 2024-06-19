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

    /// @notice Provides information that matches the hash value requested in L2
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _to requester's address
    /// @param _totalAmount Total amount requested by l2
    /// @param _fwAmount The amount the requester wants to receive in l1
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
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
        require(cancelL1[l2HashValue] == address(0), "already cancel");
        
        
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
        
        IL1CrossDomainMessenger(chainData[_l2chainId].crossDomainMessenger).sendMessage(
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


    /// @notice This is a function created to test the reprovide function. This is for testing purposes only and will be deleted upon final distribution.
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _to requester's address
    /// @param _totalAmount Total amount requested by l2
    /// @param _fwAmount The amount the requester wants to receive in l1
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
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
        require(cancelL1[l2HashValue] == address(0), "already cancel");
        
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

    /// @notice If provide is successful in L1 but the transaction fails in L2, this is a function that can recreate the transaction in L2.
    /// @param _fwAmount The amount the requester wants to receive in l1
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function reprovideCT(
        uint256 _fwAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        nonReentrant
    {
        require(successCT[_hash] == true, "not provide");
        require(provideAccount[_hash] != address(0), "not provide");
        require(cancelL1[_hash] == address(0), "already cancel");

        bool editCheck;
        
        if (editFwAmount[_hash] > 0) {
            require(editFwAmount[_hash] == _fwAmount, "check edit fwAmount");
            editCheck = true;
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            1,
            provideAccount[_hash],
            _fwAmount,
            _salecount,
            _hash,
            editCheck
        );

        IL1CrossDomainMessenger(chainData[_l2chainId].crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );
    }

    /// @notice Cancels the request requested by the requester.
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _totalAmount Total amount requested by l2
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
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

        cancelL1[l2HashValue] = msg.sender;
        successCT[l2HashValue] = true;

        IL1CrossDomainMessenger(chainData[_l2chainId].crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );

    }


    /// @notice If the cancel function succeeds in L1 but fails in L2, this function calls the transaction in L2 again.
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function resendCancel(
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        nonReentrant
    {
        require(successCT[_hash] == true, "not cancel");
        require(cancelL1[_hash] != address(0), "not cancel");
        bytes memory message;

        message = makeEncodeWithSignature(
            2,
            cancelL1[_hash],
            0,
            _salecount,
            _hash,
            false
        );

        IL1CrossDomainMessenger(chainData[_l2chainId].crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );
    }
        
    /// @notice This is a function that changes the value that the requester wants to receive.
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _totalAmount Total amount requested by l2
    /// @param _fwAmount The amount the requester wants to receive in l1
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _hash Hash value generated upon request
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

    /// @notice Create a Hash value and check if it matches the Hash value created upon request in L2.
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _to This is the address of the request.
    /// @param _totalAmount Total amount requested by l2
    /// @param _saleCount Number generated upon request
    /// @param _l2chainId request requested chainId
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

    /// @notice This is a function that creates encodeWithSignature according to each function.
    /// @param number A number that determines what type of function to create
    /// @param to This is the address of the request.
    /// @param amount The amount the requester wants to receive in l1
    /// @param saleCount  Number generated upon request
    /// @param byteValue Hash value generated upon request
    /// @param _edit Check whether the edit function was executed
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


    /// @notice Function that returns the chainId of the current contract
    function _getChainID() public view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    /// @notice Function that returns the chainId of the current contract
    /// @param _sender sender applying to provide
    /// @param _l1token l1token address applying to provide
    /// @param _fwAmount Amount provided
    function _approve(
        address _sender,
        address _l1token,
        uint256 _fwAmount
    ) internal view {
        uint256 allow = IERC20(_l1token).allowance(_sender, address(this));
        require(allow >= _fwAmount, "need approve");
    }


}