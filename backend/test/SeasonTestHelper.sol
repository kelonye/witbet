pragma solidity >=0.5.3 <0.7.0;
pragma experimental ABIEncoderV2;

import "../contracts/Season.sol";

contract SeasonTestHelper is Season {
    uint256 timestamp;

    constructor (
        address _wbi,
        uint8 _noOfTeams,
        uint256 _witnetRequestFee,
        uint256 _betFee
    ) Season(
        _wbi,
        _noOfTeams,
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