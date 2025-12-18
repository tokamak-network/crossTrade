// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { IL1CrossDomainMessenger } from "../interfaces/IL1CrossDomainMessenger.sol";
import { L2toL2CrossTradeStorageL1 } from "./L2toL2CrossTradeStorageL1.sol";
import { ReentrancyGuard } from "../utils/ReentrancyGuard.sol";
import { IL1StandardBridge } from "./IL1StandardBridge.sol";
import { EOA } from "../libraries/EOA.sol";

contract L2toL2CrossTradeL1 is ProxyStorage, AccessibleCommon, L2toL2CrossTradeStorageL1, ReentrancyGuard {

    using SafeERC20 for IERC20;

    event EditCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        address _receiver,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hash
    );

    event ProvideCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        address _receiver,
        address _provider,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hash
    );

    event L1CancelCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        address _receiver,
        uint256 _totalAmount,
        uint256 indexed _saleCount,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hash
    );

    modifier onlyEOA() {
        require(EOA.isSenderEOA(), "CT: Function can only be called from an EOA");
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
    /// @param _receiver receiver's address (who will receive the tokens on destination L2)
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _editedctAmount ctAmount edited by the requester
    /// @param _saleCount Number generated upon request
    /// @param _l2SourceChainId request requested l2SourcechainId
    /// @param _l2DestinationChainId request requested l2DestinationChainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function provideCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requestor,
        address _receiver,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _editedctAmount,
        uint256 _saleCount,
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
            _receiver,
            _totalAmount,
            _initialctAmount,
            _saleCount,
            l1ChainId,
            _l2SourceChainId,
            _l2DestinationChainId
        );
        require(l2HashValue == _hash, "CT: Hash values do not match.");
        require(completedCT[l2HashValue] == false, "CT: Already completed");
        require(_editedctAmount == editCtAmount[l2HashValue], "CT: EditedctAmount not match");

        uint256 ctAmount = _initialctAmount;

        if (editCtAmount[l2HashValue] > 0) {
            ctAmount = editCtAmount[l2HashValue];
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            CLAIM_CT,
            msg.sender,
            ctAmount,
            _saleCount,
            _l2DestinationChainId,
            l2HashValue
        );
        
        provideAccount[l2HashValue] = msg.sender;
        completedCT[l2HashValue] = true;

        //sendMessage to the sourceChain 
        IL1CrossDomainMessenger(chainData[_l2SourceChainId].crossDomainMessenger).sendMessage(
            chainData[_l2SourceChainId].l2CrossTradeContract, 
            message, 
            _minGasLimit
        );


        if (NATIVE_TOKEN == _l1token){
            require(msg.value == ctAmount, "CT: ETH need same amount");
            if (chainData[_l2DestinationChainId].useCustomBridge){
                IL1StandardBridge(chainData[_l2DestinationChainId].l1StandardBridge).bridgeETHTo{value: ctAmount}(
                    _receiver,
                    ctAmount,
                    _minGasLimit,
                    "0x"
                );
            } else {
                IL1StandardBridge(chainData[_l2DestinationChainId].l1StandardBridge).bridgeETHTo{value: ctAmount}(
                    _receiver,
                    _minGasLimit,
                    "0x"
                );
            }
        } else {
            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), ctAmount);

            if(usdcAddress == _l1token){
                IERC20(_l1token).approve(chainData[_l2DestinationChainId].l1USDCBridge,ctAmount);
                IL1StandardBridge(chainData[_l2DestinationChainId].l1USDCBridge).bridgeERC20To(
                    _l1token,
                    _l2DestinationToken,
                    _receiver,
                    ctAmount,
                    _minGasLimit,
                    "0x"
                );
            } else  {
                if(chainData[_l2DestinationChainId].l2NativeTokenAddressOnL1 == _l1token){

                    IERC20(_l1token).approve(chainData[_l2DestinationChainId].l1StandardBridge,ctAmount);
                    IL1StandardBridge(chainData[_l2DestinationChainId].l1StandardBridge).bridgeNativeTokenTo(
                        _receiver,
                        ctAmount,
                        _minGasLimit,
                        "0x"
                    );
                } else if (usdtAddress == _l1token) {
                    IERC20(_l1token).approve(chainData[_l2DestinationChainId].l1StandardBridge,0);
                    IERC20(_l1token).approve(chainData[_l2DestinationChainId].l1StandardBridge,ctAmount);
                    IL1StandardBridge(chainData[_l2DestinationChainId].l1StandardBridge).bridgeERC20To(
                        _l1token,
                        _l2DestinationToken,
                        _receiver,
                        ctAmount,
                        _minGasLimit,
                        "0x"
                    );
                } else{
                    IERC20(_l1token).approve(chainData[_l2DestinationChainId].l1StandardBridge,ctAmount);
                    IL1StandardBridge(chainData[_l2DestinationChainId].l1StandardBridge).bridgeERC20To(
                        _l1token,
                        _l2DestinationToken,
                        _receiver,
                        ctAmount,
                        _minGasLimit,
                        "0x"
                    );
                }

            }

        }

        emit ProvideCT(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _requestor,
            _receiver,
            msg.sender,
            _totalAmount,
            ctAmount,
            _saleCount,
            _l2SourceChainId,
            _l2DestinationChainId,
            _hash
        );
    }


    /// @notice If provide is successful in L1 but the transaction fails in L2, this is a function that can recreate the transaction in L2.
    /// @param _saleCount Number generated upon request
    /// @param _l2SourceChainId request requested l2SourcechainId
    /// @param _l2DestinationChainId request requested l2DestinationChainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function resendProvideCTMessage(
        uint256 _saleCount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        uint32 _minGasLimit,
        bytes32 _hash
    )
        external
        onlyEOA
        nonReentrant
    {
        require(completedCT[_hash] == true, "CT: Is not yet completed");
        require(provideAccount[_hash] != address(0), "CT: Provider is not found");
        
        uint256 ctAmount;
        if (editCtAmount[_hash] > 0) {
            ctAmount = editCtAmount[_hash];
        }

        bytes memory message;

        message = makeEncodeWithSignature(
            CLAIM_CT,
            provideAccount[_hash],
            ctAmount,
            _saleCount,
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
    /// @param _receiver Address that would receive the tokens on destination L2
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _saleCount Number generated upon request
    /// @param _l2SourceChainId request requested chainId
    /// @param _l2DestinationChainId request  Destination chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function cancel( 
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _receiver,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _saleCount,
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
            _receiver,
            _totalAmount,
            _initialctAmount,
            _saleCount,
            thisChainId,
            _l2SourceChainId,
            _l2DestinationChainId

        );
        require(l2HashValue == _hash, "CT: Hash values do not match.");
        require(completedCT[l2HashValue] == false, "CT: Already completed");

        bytes memory message;

        message = makeEncodeWithSignature(
            CANCEL_CT,
            msg.sender,
            0,
            _saleCount,
            _l2DestinationChainId,
            _hash
        );

        cancelL1[l2HashValue] = msg.sender;
        completedCT[l2HashValue] = true;

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
            _receiver,
            _totalAmount, 
            _saleCount,
            _l2SourceChainId,
            _l2DestinationChainId,
            l2HashValue
        );
    }


    /// @notice If the cancel function succeeds in L1 but fails in L2, this function calls the transaction in L2 again.
    /// @param _saleCount Number generated upon request
    /// @param _l2SourceChainId request requested chainId
    /// @param _l2DestinationChainId request  Destination chainId
    /// @param _minGasLimit minGasLimit
    /// @param _hash Hash value generated upon request
    function resendCancelMessage(
        uint256 _saleCount,
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
        require(completedCT[_hash] == true, "CT: Is not yet canceled");
        require(cancelL1Address != address(0), "CT: CancelL1Address is not found");
        bytes memory message;

        message = makeEncodeWithSignature(
            CANCEL_CT,
            cancelL1Address,
            0,
            _saleCount,
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
    /// @param _receiver Address that would receive the tokens on destination L2
    /// @param _totalAmount Total amount requested by l2
    /// @param _initialctAmount ctAmount requested when creating the initial request
    /// @param _editedctAmount The amount that the requester requested to edit
    /// @param _saleCount Number generated upon request
    /// @param _l2SourceChainId request requested chainId
    /// @param _hash Hash value generated upon request
    function editFee(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _receiver,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _editedctAmount,
        uint256 _saleCount,
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
            _receiver,
            _totalAmount,
            _initialctAmount,
            _saleCount,
            thisChainId,
            _l2SourceChainId,
            _l2DestinationChainId
        );
        require(l2HashValue == _hash, "CT: Hash values do not match.");
        require(completedCT[l2HashValue] == false, "CT: Already completed");
        require(_editedctAmount > 0, "CT: ctAmount need nonZero");
        
        editCtAmount[l2HashValue] = _editedctAmount;

        emit EditCT(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            msg.sender,
            _receiver,
            _totalAmount,
            _editedctAmount, 
            _saleCount,
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
    /// @param _receiver Address that will receive the tokens on destination L2
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
        address _receiver,
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
                _receiver,
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