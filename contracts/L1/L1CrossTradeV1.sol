// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { IL1CrossDomainMessenger } from "../interfaces/IL1CrossDomainMessenger.sol";
import { L1CrossTradeStorageV1 } from "./L1CrossTradeStorageV1.sol";

contract L1CrossTradeV1 is  L1CrossTradeStorageV1 {

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

    /// @notice Store addresses for chainId
    /// @param _crossDomainMessenger crossDomainMessenger address for chainId
    /// @param _l2CrossTrade L2CrossTradeProxy address for chainId
    /// @param _l2chainId store chainId
    function setChainInfo(
        address _crossDomainMessenger,
        address _l2CrossTrade,
        uint256 _l2chainId
    )
        external
    {   
        require(chainData[_l2chainId].crossDomainMessenger == address(0) && chainData[_l2chainId].l2CrossTradeContract == address(0),
        "ChainData already set"); 
        chainData[_l2chainId] = ChainIdData({
            crossDomainMessenger: _crossDomainMessenger,
            l2CrossTradeContract: _l2CrossTrade
        });
    }

   
    /// @notice Provides information that matches the hash value requested in L2
    ///         %% WARNING %%
    ///         Even if it does not match the request made in L2, 
    ///         the transaction in L1 will pass if only the hash value of the input information matches. (In this case, you will lose your assets in L1.)
    ///         Please be aware of double-check the request made in L2 and execute the provideCT in L1.
    ///         And We do not support ERC20, which is specially created and incurs a fee when transferring.
    ///         And Here, there is no need to input a hash value and check it, 
    ///         but in order to reduce any accidents, we input a hash value and check it.
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _requestor requester's address
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _editedAmount input the edited amount
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function provideCTOP(
        address _l1token,
        address _l2token,
        address _requestor,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _editedAmount,
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        payable
        onlyEOA
    {
        uint256 thisChainId = _getChainID();
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            _requestor,
            _totalAmount,
            _initialctAmount,
            _salecount,
            _l2chainId,
            thisChainId
        );
        require(l2HashValue == _hash, "Hash values do not match");
        require(successCT[l2HashValue] == false, "already sold");
        
        uint256 ctAmount = _initialctAmount;

        if (_editedAmount > 0) {
            require(editCtAmount[l2HashValue] == _editedAmount, "The edited amount does not match");
            ctAmount = _editedAmount;
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

        // using this we can remove chainData all together ( we give the value through params in the contract)
        if (_l1token == address(0)) {
            require(msg.value == ctAmount, "CT: ETH need same amount");
            (bool sent, ) = payable(_requestor).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), ctAmount);
            IERC20(_l1token).safeTransfer(_requestor,ctAmount);
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
    function resendProvideCTMessageOP(
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        onlyEOA
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
    ///         %% WARNING %%
    ///         Even if it does not match the request made in L2, 
    ///         the transaction in L1 will pass if only the hash value of the input information matches. 
    ///         Please be aware of double-check the request made in L2 and execute the cancel in L1.
    ///         And Here, there is no need to input a hash value and check it, 
    ///         but in order to reduce any accidents, we input a hash value and check it.
    /// @param _l1token Address of requested l1token
    /// @param _l2token Address of requested l2token
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _salecount Number generated upon request
    /// @param _l2chainId request requested chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function cancelOP( 
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
    {
        uint256 thisChainId = _getChainID();

        bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _initialctAmount,
            _salecount,
            _l2chainId,
            thisChainId
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
    function resendCancelMessageOP(
        uint256 _salecount,
        uint256 _l2chainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        onlyEOA
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
    ///         %% WARNING %%
    ///         Even if it does not match the request made in L2, 
    ///         the transaction in L1 will pass if only the hash value of the input information matches. 
    ///         Please be aware of double-check the request made in L2 and execute the editFee in L1.
    ///         And Here, there is no need to input a hash value and check it, 
    ///         but in order to reduce any accidents, we input a hash value and check it.
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
    {
        uint256 thisChainId = _getChainID();
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2token,
            msg.sender,
            _totalAmount,
            _initialctAmount,
            _salecount,
            _l2chainId,
            thisChainId
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
    /// @param _startChainId Starting chainId of the corresponding HashValue
    /// @param _endChainId The chainId where this contract was deployed
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
        if (number == CLAIM_CT) {
            return abi.encodeWithSignature("claimCT(address,uint256,uint256,bytes32)", 
                to, 
                amount,
                saleCount,
                byteValue
            );
        } else {
            return abi.encodeWithSignature("cancelCT(address,uint256,bytes32)", 
                to,
                saleCount,
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