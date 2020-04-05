pragma solidity >=0.5.3 <0.7.0;
pragma experimental ABIEncoderV2;

import "witnet-ethereum-bridge/contracts/UsingWitnet.sol";
// import "./requests/MatchScoresRequest.sol";

contract Bet is UsingWitnet {
    // Fees to include for the witnet data request
    uint256 public witnetRequestFee;

    // Contract earning
    uint256 public betFee;

    // Witnet Data Request for tokens
    Request matchInfoRequest;

    /// @dev Creates a Betting Season
    /// @param _wbi address of Witnet Bridge Interface
    /// @param _witnetRequestFee fee for data request forward
    /// @param _betFee fee kept by contract
    constructor(
        address _wbi,
        uint256 _witnetRequestFee,
        uint256 _betFee
    ) UsingWitnet(_wbi) public {
        witnetRequestFee = _witnetRequestFee;
        betFee = _betFee;
        // matchInfoRequest = new ScoresRequest();
    }

    /// @dev Gets the timestamp of the current block as seconds since unix epoch
    /// @return timestamp
    function getTimestamp() public view virtual  returns (uint256) {
        return block.timestamp;
    }

}
