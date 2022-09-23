// SPDX-License-Identifier: AGPL-3.0-only

/*
    Target.sol - SKALE Manager
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

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@skalenetwork/ima-interfaces/IMessageReceiver.sol";


interface ITarget {
    receive() external payable;
    function sendSFuel(address payable receiver, uint value) external;
    function sendMessage(address from, IMessageReceiver receiver, bytes calldata message) external;
    function targetFunction(uint number, string calldata line) external payable;    
}

contract Target is ITarget {
    using AddressUpgradeable for address payable;

    event EtherReceived(
        address sender,
        uint amount
    );

    event ExecutionResult(
        uint number,
        string line
    );

    receive() external payable override {
        emit EtherReceived(msg.sender, msg.value);
    }

    function targetFunction(uint number, string calldata line) external payable override {
        emit ExecutionResult(number, line);
        if (msg.value > 0) {
            emit EtherReceived(msg.sender, msg.value);
        }
    }

    function sendMessage(address from, IMessageReceiver receiver, bytes calldata message) external override {
        require(receiver.postMessage("D2 schain", from, message) == address(0), "postMessage call failed");
    }

    function sendSFuel(address payable receiver, uint value) external override {
        receiver.sendValue(value);
    }
}