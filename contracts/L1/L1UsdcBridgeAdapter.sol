// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IL1UsdcBridgeDeposit {
    function depositERC20To(
        address _l1Token,
        address _l2Token,
        address _to,
        uint256 _amount,
        uint32 _minGasLimit,
        bytes calldata _extraData
    ) external;
}

/// @notice Adapter that exposes bridgeERC20To (IL1StandardBridge interface) and
///         delegates to L1UsdcBridge.depositERC20To.
///         CrossTrade calls: approve(adapter, amount) + bridgeERC20To(...)
///         Adapter pulls from CrossTrade, approves real bridge, calls depositERC20To.
contract L1UsdcBridgeAdapter {
    using SafeERC20 for IERC20;

    address public immutable l1UsdcBridge;

    constructor(address _l1UsdcBridge) {
        l1UsdcBridge = _l1UsdcBridge;
    }

    function bridgeERC20To(
        address _l1Token,
        address _l2Token,
        address _to,
        uint256 _amount,
        uint32 _minGasLimit,
        bytes calldata _extraData
    ) external {
        IERC20(_l1Token).safeTransferFrom(msg.sender, address(this), _amount);
        IERC20(_l1Token).forceApprove(l1UsdcBridge, _amount);
        IL1UsdcBridgeDeposit(l1UsdcBridge).depositERC20To(
            _l1Token, _l2Token, _to, _amount, _minGasLimit, _extraData
        );
    }
}
