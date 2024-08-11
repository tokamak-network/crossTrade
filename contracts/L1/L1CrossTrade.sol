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
        address _l1token,
        address _l2token,
        address _requester,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l2chainId,
        bytes32 _hash
    );

    event ProvideCT(
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

    event L1CancelCT(
        address _l1token,
        address _l2token,
        address _requester,
        uint256 _totalAmount,
        uint256 indexed _saleCount,
        uint256 _l2chainId,
        bytes32 _hash
    );

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "L2FW: function can only be called from an EOA");
        _;
    }

    /// @notice Provides information that matches the hash value requested in L2
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _requestor requester's address
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function provideCT(
        address _l1token,
        address _l2token,
        address _requestor,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        payable
        onlyEOA
        nonReentrant
    {
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            _requestor,
            _totalAmount,
            _initialctAmount,
            _salecount,
            _l2chainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");
        
        uint256 ctAmount = _initialctAmount;

        if (editCtAmount[l2HashValue] > 0) {
            ctAmount = editCtAmount[l2HashValue];
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            CLAIM_CT,
            msg.sender,
            ctAmount,
            _salecount,
            l2HashValue
        );
        
        provideAccount[l2HashValue] = msg.sender;
        successCT[l2HashValue] = true;
        
        IL1CrossDomainMessenger(chainData[_l2chainId].crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );

        if (chainData[_l2chainId].l1TON == _l1token) {
            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), ctAmount);
            IERC20(_l1token).safeTransfer(_requestor,ctAmount);
        } else if (chainData[_l2chainId].legacyERC20ETH == _l1token) {
            require(msg.value == ctAmount, "CT: ETH need same amount");
            (bool sent, ) = payable(_requestor).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            IERC20(_l1token).safeTransferFrom(msg.sender, _requestor, ctAmount);
        }

        emit ProvideCT(
            _l1token,
            _l2token,
            _requestor,
            msg.sender,
            _totalAmount,
            ctAmount,
            _salecount,
            _l2chainId,
            _hash
        );
    }


    /// @notice This is a function created to test the reprovide function. This is for testing purposes only and will be deleted upon final distribution.
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _requestor requester's address
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function provideTest(
        address _l1token,
        address _l2token,
        address _requestor,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        payable
        onlyEOA
        nonReentrant
    {
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            _requestor,
            _totalAmount,
            _initialctAmount,
            _salecount,
            _l2chainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");
        
        uint256 ctAmount = _initialctAmount;

        if (editCtAmount[l2HashValue] > 0) {
            ctAmount = editCtAmount[l2HashValue];
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            CLAIM_CT,
            msg.sender,
            ctAmount,
            _salecount,
            l2HashValue
        );
        
        provideAccount[l2HashValue] = msg.sender;
        successCT[l2HashValue] = true;

        if (chainData[_l2chainId].l1TON == _l1token) {
            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), ctAmount);
            IERC20(_l1token).safeTransfer(_requestor,ctAmount);
        } else if (chainData[_l2chainId].legacyERC20ETH == _l1token) {
            require(msg.value == ctAmount, "CT: ETH need same amount");
            (bool sent, ) = payable(_requestor).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            IERC20(_l1token).safeTransferFrom(msg.sender, _requestor, ctAmount);
        }

        emit ProvideCT(
            _l1token,
            _l2token,
            _requestor,
            msg.sender,
            _totalAmount,
            ctAmount,
            _salecount,
            _l2chainId,
            _hash
        );
    }

    /// @notice If provide is successful in L1 but the transaction fails in L2, this is a function that can recreate the transaction in L2.
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function resendProvideCTMessage(
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        onlyEOA
        nonReentrant
    {
        require(successCT[_hash] == true, "not provide");
        require(provideAccount[_hash] != address(0), "not provide");
        
        uint256 ctAmount;
        if (editCtAmount[_hash] > 0) {
            ctAmount = editCtAmount[_hash];
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            CLAIM_CT,
            provideAccount[_hash],
            ctAmount,
            _salecount,
            _hash
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
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function cancel( 
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        onlyEOA
        nonReentrant
    {
         bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _initialctAmount,
            _salecount,
            _l2chainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");

        bytes memory message;

        message = makeEncodeWithSignature(
            CANCEL_CT,
            msg.sender,
            0,
            _salecount,
            _hash
        );

        cancelL1[l2HashValue] = msg.sender;
        successCT[l2HashValue] = true;

        IL1CrossDomainMessenger(chainData[_l2chainId].crossDomainMessenger).sendMessage(
            chainData[_l2chainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );

        emit L1CancelCT(
            _l1token,
            _l2token,
            msg.sender, 
            _totalAmount, 
            _salecount,
            _l2chainId,
            l2HashValue
        );
    }


    /// @notice If the cancel function succeeds in L1 but fails in L2, this function calls the transaction in L2 again.
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function resendCancelMessage(
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        onlyEOA
        nonReentrant
    {
        address cancelL1Address = cancelL1[_hash];
        require(successCT[_hash] == true, "not cancel");
        require(cancelL1Address != address(0), "not cancel");
        bytes memory message;

        message = makeEncodeWithSignature(
            CANCEL_CT,
            cancelL1Address,
            0,
            _salecount,
            _hash
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
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _editedctAmount The amount that the requester requested to edit
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _hash Hash value generated upon request
    function editFee(
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _editedctAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        bytes32 _hash
    )  
        external
        onlyEOA
        nonReentrant
    {
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _initialctAmount,
            _salecount,
            _l2chainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");
        require(_editedctAmount > 0, "ctAmount need nonZero");
        
        editCtAmount[l2HashValue] = _editedctAmount;

        emit EditCT(
            _l1token,
            _l2token,
            msg.sender, 
            _totalAmount,
            _editedctAmount, 
            _salecount,
            _l2chainId,
            l2HashValue
        );
    }

    /// @notice Create a Hash value and check if it matches the Hash value created upon request in L2.
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _requestor This is the address of the request.
    /// @param _totalAmount Total amount requested by l2
    /// @param _ctAmount Amount to be received from L1
    /// @param _saleCount Number generated upon request
    /// @param _l2chainId request requested chainId
    function getHash(
        address _l1token,
        address _l2token,
        address _requestor,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _saleCount,
        uint256 _l2chainId
    )
        public
        view
        returns (bytes32)
    {
        uint256 l1chainId = _getChainID();
        return keccak256(
            abi.encode(
                _l1token, 
                _l2token, 
                _requestor, 
                _totalAmount, 
                _ctAmount, 
                _saleCount, 
                l1chainId, 
                _l2chainId
            )
        );
    }

    /// @notice This is a function that creates encodeWithSignature according to each function.
    /// @param number A number that determines what type of function to create
    /// @param to This is the address of the provider or requester.
    /// @param amount The amount the requester wants to receive in l1
    /// @param saleCount Number generated upon request
    /// @param byteValue Hash value generated upon request
    function makeEncodeWithSignature(
        uint8 number,
        address to, 
        uint256 amount,
        uint256 saleCount,
        bytes32 byteValue
    )
        private
        view
        returns (bytes memory)
    {
        uint256 chainId = _getChainID();
        if (number == CLAIM_CT) {
            return abi.encodeWithSignature("claimCT(address,uint256,uint256,uint256,bytes32)", 
                to, 
                amount,
                saleCount,
                chainId,
                byteValue
            );
        } else {
            return abi.encodeWithSignature("cancelCT(address,uint256,uint256)", 
                to,
                saleCount,
                chainId,
                byteValue
            );
        }
    }


    /// @notice Function that returns the chainId of the current contract
    function _getChainID() private view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

}