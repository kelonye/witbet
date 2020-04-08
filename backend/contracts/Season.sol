pragma solidity >=0.5.3 <0.7.0;
pragma experimental ABIEncoderV2;

import "witnet-ethereum-bridge/contracts/UsingWitnet.sol";
// import "./requests/MatchScoresRequest.sol";

contract Season is UsingWitnet {
    // Total fees (includes witnet data request fee, contract earning etc)
    uint256 public betFee;

    // No of teams, usually 20
    // Team ids are assigned from 0...noOfTeams-1
    uint8 noOfTeams;

    // Time before betting is closed before match start
    uint256 matchBuildUpDuration;

    // Witnet Data Request for match info (score etc)
    Request matchInfoRequest;

    // Structure with match info (bets etc)
    struct Match {
        // User -> ether value map
        mapping (address => uint256) bets;
        mapping (address => uint256) homeTeamWinBets;
        mapping (address => uint256) awayTeamWinBets;
        mapping (address => uint256) drawBets;

        // Paid winners
        mapping (address => bool) paid;

        // Ether staked
        uint256 totalBetsAmount;
        uint256 totalHomeTeamWinBetsAmount;
        uint256 totalAwayTeamWinBetsAmount;
        uint256 totalDrawBetsAmount;

        // [home, away] score
        int128[2] score;

        // Game start time
        uint256 startTime;

        // Game end time
        uint256 endTime;

        // Id of the current data request in progress
        uint256 witnetRequestId;
    }

    // Mapping of bet bets
    // Key contains home_team+away_team info
    mapping (bytes32 => Match) matches;

    // States define the action allowed in the current contest window
    enum MatchState{
        SCHEDULED, // Initial state
        BUILD_UP, // 1 hr before
        IN_PROGRESS, // In progress
        ENDED // Ready to pay winners
    }

    // States define the possible bet types
    enum BetType{ WIN, LOSE, DRAW }

    /// @dev Creates a Betting Season
    /// @param _wbi address of Witnet Bridge Interface
    /// @param _noOfTeams no of teams in the season
    /// @param _betFee fee kept by contract
    /// @param _matchBuildUpDuration typically 1 hr
    constructor(
        address _wbi,
        uint8 _noOfTeams,
        uint256 _betFee,
        uint256 _matchBuildUpDuration
    ) UsingWitnet(_wbi) public {
        noOfTeams = _noOfTeams;
        betFee = _betFee;
        matchBuildUpDuration = _matchBuildUpDuration;
        // matchInfoRequest = new ScoresRequest();
    }

    /// Place bet on a currently scheduled match
    /// @param _home_team id
    /// @param _away_team id
    function placeBet(uint8 _home_team, uint8 _away_team, uint8 _type) public payable {
        require(msg.value > 0, "Should insert a positive amount");
        require(msg.value > betFee, "Should be greater than bet fee");
        require(_home_team < noOfTeams, "Home team id provided is unknown");
        require(_away_team < noOfTeams, "Away team id provided is unknown");
        require(_home_team != _away_team, "Teams need to be different");
        require(getMatchState(_home_team, _away_team) == MatchState.SCHEDULED, "Betting window is not closed");
        require(_type < uint8(BetType.DRAW), "Unknown bet type");

        // Calculate the match id
        bytes32 matchId = getMatchId(_home_team, _away_team);

        // Upset match bet infos
        uint256 betAmount = msg.value - betFee;
        matches[matchId].totalBetsAmount += betAmount;
        matches[matchId].bets[msg.sender] += betAmount;
        if (_type == uint8(BetType.WIN)) {
            matches[matchId].totalHomeTeamWinBetsAmount += betAmount;
            matches[matchId].homeTeamWinBets[msg.sender] += betAmount;
        } else if (_type == uint8(BetType.LOSE)) {
            matches[matchId].totalAwayTeamWinBetsAmount += betAmount;
            matches[matchId].awayTeamWinBets[msg.sender] += betAmount;
        } else {
            matches[matchId].totalDrawBetsAmount += betAmount;
            matches[matchId].drawBets[msg.sender] += betAmount;
        }

        // Emit
        // emit BetPlaced(_home_team, _away_team, msg.sender, msg.value);
    }

    /// @dev Pays out to winning users after match ends
    /// @param _home_team id
    /// @param _away_team id
    function payout(uint8 _home_team, uint8 _away_team) public payable {
        require(getMatchState(_home_team, _away_team) == MatchState.ENDED, "Game is not closed");

        bytes32 matchId = getMatchId(_home_team, _away_team);
        Match storage _match = matches[matchId];
        
        require(_match.paid[msg.sender] == false, "Address already paid");
        require(_match.bets[msg.sender] > 0, "Address has no bets in the match");

        // Prize calculation
        uint256 winnerAmount = 0;
        if (_match.score[0] > _match.score[1]) {
            winnerAmount = _match.totalHomeTeamWinBetsAmount;
        } else if (_match.score[0] < _match.score[1]) {
            winnerAmount = _match.totalAwayTeamWinBetsAmount;
        } else {
            winnerAmount = _match.totalDrawBetsAmount;
        }
        uint256 prize = _match.bets[msg.sender] / winnerAmount * _match.totalBetsAmount;
        
        // Set paid flag and Transfer
        _match.paid[msg.sender] = true;
        msg.sender.transfer(prize);
    }
    
    function initReadFromWitnet() public payable {

    }

    function completeReadFromWitnet() public {

    }

    /// @dev Gets the timestamp of the current block as seconds since unix epoch
    /// @return timestamp
    function getNow() public view virtual returns (uint256) {
        return block.timestamp;
    }

    /// Get match(`_home_team`:`_away_team`) unique id
    /// @param _home_team id
    /// @param _away_team id
    /// @return match id
    function getMatchId(uint8 _home_team, uint8 _away_team) public view returns (bytes32) {
        return keccak256(abi.encodePacked(_home_team, _away_team));
    }

    /// Get total amount of bets in match(`_home_team`:`_away_team`)
    /// @param _home_team id
    /// @param _away_team id
    /// @return match total bets amount
    function getMatchTotalBetsAmount(uint8 _home_team, uint8 _away_team) public returns (uint256) {
        return matches[getMatchId(_home_team, _away_team)].totalBetsAmount;
    }

    /// Get total amount of bets in match(`_home_team`:`_away_team`) for sender
    /// @param _home_team id
    /// @param _away_team id
    /// @return user match total bets amount
    function getMyMatchTotalBetsAmount(uint8 _home_team, uint8 _away_team) public returns (uint256) {
        return matches[getMatchId(_home_team, _away_team)].bets[msg.sender];
    }

    /// @dev Gets a match's state
    /// @param _home_team id
    /// @param _away_team id
    /// @return day state
    function getMatchState(uint8 _home_team, uint8 _away_team) public returns (MatchState) {
        bytes32 matchId = getMatchId(_home_team, _away_team);
        Match storage _match = matches[matchId];
        uint256 _now = getNow();
        if (_match.startTime > (_now + matchBuildUpDuration)) {
            // Match betting window still open
            return MatchState.SCHEDULED;
        } else if (_match.startTime > _now) {
            // Betting closed
            return MatchState.BUILD_UP;
        } else if (_match.totalBetsAmount == 0) {
            // Match betting window closed but no one placed bets
            // Match could still be in progress at this instance
            return MatchState.ENDED;
        } else if (_match.endTime > _now) {
            // Match ended
            return MatchState.ENDED;
        }
        return MatchState.IN_PROGRESS;
    }
}
