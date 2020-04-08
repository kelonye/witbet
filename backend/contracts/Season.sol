pragma solidity >=0.5.3 <0.7.0;
pragma experimental ABIEncoderV2;

import "witnet-ethereum-bridge/contracts/UsingWitnet.sol";
// import "./requests/MatchScoresRequest.sol";

contract Season is UsingWitnet {
    // Fees to include for the witnet data request
    uint256 public witnetRequestFee;

    // Contract earning
    uint256 public betFee;

    // Witnet Data Request for tokens
    Request matchInfoRequest;

    // No of teams, usually 20
    // Team ids are assigned from 0...noOfTeams-1
    uint8 noOfTeams;

    // Structure with match info (bets etc)
    struct Match {
        // User -> ether value map
        mapping (address => uint256) bets;

        // Whether winners awarded
        mapping (address => bool) paid;

        // Total ether staked
        uint256 totalAmount;

        // [home, away] score
        int128[2] score;

        // Betting closed
        // bool bettingClosed;

        // Game played
        // bool final;

        // Id of the data request inserted in the WBI
        uint256 witnetRequestId;

        // Result was read from WBI
        bool witnetReadResult;
    }

    // Mapping of bet participations
    // Key contains home_team+away_team info
    mapping (bytes32 => Match) matches;

    /// @dev Creates a Betting Season
    /// @param _wbi address of Witnet Bridge Interface
    /// @param _witnetRequestFee fee for data request forward
    /// @param _betFee fee kept by contract
    constructor(
        address _wbi,
        uint8 _noOfTeams,
        uint256 _witnetRequestFee,
        uint256 _betFee
    ) UsingWitnet(_wbi) public {
        noOfTeams = _noOfTeams;
        witnetRequestFee = _witnetRequestFee;
        betFee = _betFee;
        // matchInfoRequest = new ScoresRequest();
    }

    /// Place bet on a match happening in the future, this season
    /// @param _home_team id
    /// @param _away_team id
    function placeBet(uint8 _home_team, uint8 _away_team) public payable {
        require(msg.value > 0, "Should insert a positive amount");
        require(_home_team < noOfTeams, "Home team id provided is unknown");
        require(_away_team < noOfTeams, "Away team id provided is unknown");
        require(_home_team != _away_team, "Teams need to be different");

        // Calculate the match id
        bytes32 matchId = getMatchId(_home_team, _away_team);

        // Upset match totalAmount and bet infos
        matches[matchId].totalAmount += msg.value;
        matches[matchId].bets[msg.sender] += msg.value;

        // emit BetPlaced(_home_team, _away_team, msg.sender, msg.value);
    }

    /// @dev Gets the timestamp of the current block as seconds since unix epoch
    /// @return timestamp
    function getTimestamp() public view virtual returns (uint256) {
        return block.timestamp;
    }

    /// Get match(`_home_team`:`_away_team`) unique id
    /// @param _home_team id
    /// @param _away_team id
    function getMatchId(uint8 _home_team, uint8 _away_team) public view returns (bytes32) {
        return keccak256(abi.encodePacked(_home_team, _away_team));
    }

    /// Get total amount of bets in match(`_home_team`:`_away_team`)
    /// @param _home_team id
    /// @param _away_team id
    function getMatchTotalBetsAmount(uint8 _home_team, uint8 _away_team) public returns (uint256) {
        return matches[getMatchId(_home_team, _away_team)].totalAmount;
    }

    /// Get total amount of bets in match(`_home_team`:`_away_team`) for sender
    /// @param _home_team id
    /// @param _away_team id
    function getMyMatchTotalBetsAmount(uint8 _home_team, uint8 _away_team) public returns (uint256) {
        return matches[getMatchId(_home_team, _away_team)].bets[msg.sender];
    }

}
