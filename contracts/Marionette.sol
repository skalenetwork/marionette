// SPDX-License-Identifier: AGPL-3.0-only

/*
    Marionette.sol - SKALE Manager
    Copyright (C) 2021-Present SKALE Labs
    @author Dmytro Stebaiev

    SKALE Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SKALE Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity 0.8.11;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "./interfaces/IMarionette.sol";


contract Marionette is IMarionette, AccessControlEnumerableUpgradeable {

    using AddressUpgradeable for address;
    using AddressUpgradeable for address payable;

    struct FunctionCall {
        address receiver;
        uint value;
        bytes data;
    }

    bytes32 public constant IMA_ROLE = keccak256("IMA_ROLE");
    bytes32 public constant PUPPETEER_ROLE = keccak256("PUPPETEER_ROLE");
    string public constant ACCESS_VIOLATION = "Access violation";

    event EtherReceived(
        address sender,
        uint amount
    );

    event EtherSent(
        address receiver,
        uint amount
    );

    event FunctionCallResult (
        bytes output
    );

    receive() external payable override {
        emit EtherReceived(msg.sender, msg.value);
    }

    function initialize(address owner, address ima) external override initializer {
        AccessControlEnumerableUpgradeable.__AccessControlEnumerable_init();
        AccessControlUpgradeable._setupRole(DEFAULT_ADMIN_ROLE, address(this));
        AccessControlUpgradeable._setupRole(PUPPETEER_ROLE, owner);
        if (ima != address(0)) {
            AccessControlUpgradeable._setupRole(IMA_ROLE, ima);
        }
    }

    function postMessage(
        bytes32,
        address sender,
        bytes calldata data
    )
    external
    override
    returns (address)
    {
        require(hasRole(IMA_ROLE, msg.sender), "Sender is not IMA");
        require(hasRole(PUPPETEER_ROLE, sender), ACCESS_VIOLATION);

        FunctionCall memory functionCall = _parseFunctionCall(data);

        bytes memory output = _doCall(payable(functionCall.receiver), functionCall.value, functionCall.data);        
        emit FunctionCallResult(output);

        return address(0);
    }

    function execute(
        address payable target,
        uint value,
        bytes calldata data
    )
        external
        payable
        override
        returns (bytes memory)
    {
        require(hasRole(PUPPETEER_ROLE, msg.sender), ACCESS_VIOLATION);

        return _doCall(target, value, data);
    }

    function sendFuel(address payable target, uint value) external payable override {
        require(hasRole(PUPPETEER_ROLE, msg.sender), ACCESS_VIOLATION);

        _doCall(target, value, "0x");
    }

    function encodeFunctionCall(
        address receiver,
        uint value,
        bytes calldata data
    )
        external
        pure
        override
        returns (bytes memory)
    {
        return abi.encode(receiver, value, data);
    }

    // private

    function _doCall(address payable target, uint value, bytes memory data) private returns (bytes memory) {

        if (msg.value > 0) {
            emit EtherReceived(msg.sender, msg.value);
        }

        if (value > 0) {
            emit EtherSent(target, value);
        }

        if (target.isContract()) {
            if (data.length >= 4) {
                return target.functionCallWithValue(data, value);
            } else {
                target.sendValue(value);
                return "0x";
            }                        
        } else {
            target.sendValue(value);
            return "0x";
        }
    }

    function _parseFunctionCall(bytes calldata data) private pure returns (FunctionCall memory functionCall) {
        (functionCall.receiver, functionCall.value, functionCall.data) = abi.decode(data, (address, uint, bytes));
    }
}