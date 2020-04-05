pragma solidity >=0.5.3 <0.7.0;
pragma experimental ABIEncoderV2;

import "../contracts/Bet.sol";

contract BetTestHelper is Bet {
    uint256 timestamp;

    constructor (
        address _wbi,
        uint256 _witnetRequestFee,
        uint256 _betFee
    ) Bet(
        _wbi,
        _witnetRequestFee,
        _betFee
    ) public {}

    function getTimestamp() public view override returns (uint256){
        return timestamp;
    }

    function setTimestamp(uint256 _timestamp) public {
        timestamp = _timestamp;
    }
}