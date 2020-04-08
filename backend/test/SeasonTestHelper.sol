pragma solidity >=0.5.3 <0.7.0;
pragma experimental ABIEncoderV2;

import "../contracts/Season.sol";

contract SeasonTestHelper is Season {
    uint256 timestamp;

    constructor (
        address _wbi,
        uint8 _noOfTeams,
        uint256 _betFee,
        uint256 _matchBuildUpDuration
    ) Season(
        _wbi,
        _noOfTeams,
        _betFee,
        _matchBuildUpDuration
    ) public {}

    function getNow() public view override returns (uint256){
        return timestamp;
    }

    function setNow(uint256 _timestamp) public {
        timestamp = _timestamp;
    }

    function setMatchStartTime(uint8 _home_team, uint8 _away_team, uint256 _timestamp) public {
        matches[getMatchId(_home_team, _away_team)].startTime = _timestamp;
    }

    function setMatchEndTime(uint8 _home_team, uint8 _away_team, uint256 _timestamp) public {
        matches[getMatchId(_home_team, _away_team)].endTime = _timestamp;
    }

    function setMatchScore(uint8 _home_team, uint8 _away_team, uint8 _home_score, uint8 _away_score) public {
        matches[getMatchId(_home_team, _away_team)].score = [_home_team, _away_score];
    }
}