// SPDX-License-Identifier: AGPL-3.0-only

/*
    IMarionette.sol - SKALE Manager
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

pragma solidity 0.8.9;

import "@skalenetwork/ima-interfaces/IMessageReceiver.sol";


interface IMarionette is IMessageReceiver {
    function initialize(address owner, address ima) external;
    function encodeFunctionCall(address receiver, uint value, bytes calldata data) external pure returns (bytes memory);
}