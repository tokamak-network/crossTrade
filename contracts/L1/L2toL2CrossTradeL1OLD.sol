// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { IL1CrossDomainMessenger } from "../interfaces/IL1CrossDomainMessenger.sol";
import { L2toL2CrossTradeStorageL1OLD} from "./L2toL2CrossTradeStorageL1OLD.sol";
import { ReentrancyGuard } from "../utils/ReentrancyGuard.sol";
import { IL1StandardBridge } from "./IL1StandardBridge.sol";


contract L2toL2CrossTradeL1OLD is ProxyStorage, AccessibleCommon, L2toL2CrossTradeStorageL1OLD, ReentrancyGuard {

    using SafeERC20 for IERC20;

    event EditCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    );

    event ProvideCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        address _provider,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    );

    event L1CancelCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        uint256 _totalAmount,
        uint256 indexed _saleCount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    );

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "L2FW: function can only be called from an EOA");
        _;
    }

    /// @notice Provides information that matches the hash value requested in L2
    ///         %% WARNING %%
    ///         Even if it does not match the request made in L2, 
    ///         the transaction in L1 will pass if only the hash value of the input information matches. (In this case, you will lose your assets in L1.)
    ///         Please be aware of double-check the request made in L2 and execute the provideCT in L1.
    /// @param _l1token Address of requested l1token
    /// @param _l2SourceToken Address of requested l2Source
    /// @param _l2DestinationToken Address of requested l2Destination
    /// @param _requestor requester's address
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _salecount Number generated upon request
    /// @param _l2SourceChainId request requested l2SourcechainId
    /// @param _l2DestinationChainId request requested l2DestinationChainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function provideCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requestor,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _salecount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        payable
        onlyEOA
        nonReentrant
    {
        uint256 l1ChainId = _getChainID();
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _requestor,
            _totalAmount,
            _initialctAmount,
            _salecount,
            l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId
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
            _l2DestinationChainId,
            l2HashValue
        );
        
        provideAccount[l2HashValue] = msg.sender;
        successCT[l2HashValue] = true;
        
        // check the message before the deposit is initiated

        //sendMessage to the sourceChain 
        IL1CrossDomainMessenger(chainData[_l2SourceChainId].crossDomainMessenger).sendMessage(
            chainData[_l2SourceChainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );


        //deposit tokens to the DestinationChain 
        // might need to go thorugh the portal
        if (chainData[_l2SourceChainId].legacyERC20ETH == _l1token){
            require(msg.value == ctAmount, "CT: ETH need same amount");
             IL1StandardBridge(l1StandardBridge[_l2DestinationChainId]).depositETHTo{value: ctAmount}(
                _requestor,
                _minGasLimit,
                "0x" // encode the hash
            );
        } else {
            // depositERC20To => approve with 0 first and then approve with ctAmount for USDT
            // make a different case of usdt (check if usdt) or with type.
            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), ctAmount);
            IERC20(_l1token).approve(l1StandardBridge[_l2DestinationChainId],ctAmount);

            IL1StandardBridge(l1StandardBridge[_l2DestinationChainId]).depositERC20To(
                _l1token,
                _l2DestinationToken,
                _requestor,
                ctAmount,
                _minGasLimit,
                "0x" // encode the hash
            );
        }

        emit ProvideCT(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _requestor,
            msg.sender,
            _totalAmount,
            ctAmount,
            _salecount,
            _l2SourceChainId,
            _l2DestinationChainId,
            _hash
        );
    }


    /// @notice If provide is successful in L1 but the transaction fails in L2, this is a function that can recreate the transaction in L2.
    /// @param _salecount Number generated upon request
    /// @param _l2SourceChainId request requested l2SourcechainId
    /// @param _l2DestinationChainId request requested l2DestinationChainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function resendProvideCTMessage(
        uint256 _salecount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
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
            _l2DestinationChainId,
            _hash
        );

        IL1CrossDomainMessenger(chainData[_l2SourceChainId].crossDomainMessenger).sendMessage(
            chainData[_l2SourceChainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );
    }



    /// @notice Cancels the request requested by the requester.
    ///         %% WARNING %%
    ///         Even if it does not match the request made in L2, 
    ///         the transaction in L1 will pass if only the hash value of the input information matches. 
    ///         Please be aware of double-check the request made in L2 and execute the cancel in L1.
    /// @param _l1token Address of requested l1token
    /// @param _l2SourceToken Address of requested l2SourceToken
    /// @param _l2DestinationToken Address of requested l2DestinationToken
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _salecount Number generated upon request
    /// @param _l2SourceChainId request requested chainId
    /// @param _l2DestinationChainId request  Destination chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function cancel( 
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _salecount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        onlyEOA
        nonReentrant
    {
        uint256 thisChainId = _getChainID();

        bytes32 l2HashValue = getHash(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            msg.sender,
            _totalAmount,
            _initialctAmount,
            _salecount,
            thisChainId,
            _l2SourceChainId,
            _l2DestinationChainId

        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");

        bytes memory message;

        message = makeEncodeWithSignature(
            CANCEL_CT,
            msg.sender,
            0,
            _salecount,
            _l2DestinationChainId,
            _hash
        );

        cancelL1[l2HashValue] = msg.sender;
        successCT[l2HashValue] = true;

        IL1CrossDomainMessenger(chainData[_l2SourceChainId].crossDomainMessenger).sendMessage(
            chainData[_l2SourceChainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );

        emit L1CancelCT(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            msg.sender, 
            _totalAmount, 
            _salecount,
            _l2SourceChainId,
            _l2DestinationChainId,
            l2HashValue
        );
    }


    /// @notice If the cancel function succeeds in L1 but fails in L2, this function calls the transaction in L2 again.
    /// @param _salecount Number generated upon request
    /// @param _l2SourceChainId request requested chainId
    /// @param _l2DestinationChainId request  Destination chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function resendCancelMessage(
        uint256 _salecount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
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
            _l2DestinationChainId,
            _hash
        );

        IL1CrossDomainMessenger(chainData[_l2SourceChainId].crossDomainMessenger).sendMessage(
            chainData[_l2SourceChainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );
    }
        
    /// @notice This is a function that changes the value that the requester wants to receive.
    ///         %% WARNING %%
    ///         Even if it does not match the request made in L2, 
    ///         the transaction in L1 will pass if only the hash value of the input information matches. 
    ///         Please be aware of double-check the request made in L2 and execute the editFee in L1.
    /// @param _l1token Address of requested l1token
    /// @param _l2SourceToken Address of requested l2SourceToken
    /// @param _l2DestinationToken Address of requested l2DestinationToken
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _editedctAmount The amount that the requester requested to edit
    /// @param _salecount Number generated upon request
    /// @param _l2SourceChainId request requested chainId
    /// @param _hash Hash value generated upon request
    function editFee(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _editedctAmount,
        uint256 _salecount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    )
        external
        onlyEOA
        nonReentrant
    {
        uint256 thisChainId = _getChainID();
        bytes32 l2HashValue = getHash(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            msg.sender,
            _totalAmount,
            _initialctAmount,
            _salecount,
            thisChainId,
            _l2SourceChainId,
            _l2DestinationChainId
        );
        require(l2HashValue == _hash, "Hash values do not match.");
        require(successCT[l2HashValue] == false, "already sold");
        require(_editedctAmount > 0, "ctAmount need nonZero");
        
        editCtAmount[l2HashValue] = _editedctAmount;

        emit EditCT(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            msg.sender, 
            _totalAmount,
            _editedctAmount, 
            _salecount,
            _l2SourceChainId,
            _l2DestinationChainId,
            l2HashValue
        );
    }

    /// @notice Create a Hash value and check if it matches the Hash value created upon request in L2.
    /// @param _l1token Address of requested l1token
    /// @param _l2SourceToken Address of requested l2SourceToken
    /// @param _l2DestinationToken Address of requested l2DestinationToken
    /// @param _requestor This is the address of the request.
    /// @param _totalAmount Total amount requested by l2
    /// @param _ctAmount Amount to be received from L1
    /// @param _saleCount Number generated upon request
    /// @param _l1ChainId The chainId where this contract was deployed
    /// @param _l2SourceChainId Starting chainId of the corresponding HashValue
    /// @param _l2DestinationChainId s
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
        uint256 l2DestinationChainId,
        bytes32 byteValue
    )
        private
        view
        returns (bytes memory)
    {
        
        uint256 l1ChainId = _getChainID();
        if (number == CLAIM_CT) {
            return abi.encodeWithSignature("claimCT(address,uint256,uint256,uint256,uint256,bytes32)", 
                to, 
                amount,
                saleCount,
                l1ChainId,
                l2DestinationChainId,
                byteValue
            );
        } else {
            return abi.encodeWithSignature("cancelCT(address,uint256,uint256,uint256,bytes32)", 
                to,
                saleCount,
                l1ChainId,
                l2DestinationChainId,
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