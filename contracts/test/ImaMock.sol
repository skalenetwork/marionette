// SPDX-License-Identifier: AGPL-3.0-only

/*
    ImaMock.sol - SKALE Manager
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

import "@skalenetwork/ima-interfaces/IMessageReceiver.sol";


interface IImaMock {
    function sendMessage(address from, IMessageReceiver to, bytes calldata message) external;
    function postOutgoingMessage(
        bytes32 targetChainHash,
        address targetContract,
        bytes memory data
    ) external;
}

contract ImaMock is IImaMock {

    function sendMessage(
        address from,
        IMessageReceiver to,
        bytes calldata message
    ) external override {
        to.postMessage("D2 schain", from, message);
    }

    function postOutgoingMessage(
        bytes32 targetChainHash,
        address targetContract,
        bytes memory data
    ) external override {
        IMessageReceiver(targetContract).postMessage(
            targetChainHash,
            msg.sender,
            data
        );
    }
}