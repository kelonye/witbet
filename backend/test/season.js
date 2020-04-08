const moment = require('moment');
const truffleAssert = require('truffle-assertions');
const Witnet = artifacts.require('Witnet');
const WRBTestHelper = artifacts.require('WitnetRequestsBoardTestHelper');
const SeasonTestHelper = artifacts.require('SeasonTestHelper');
const BlockRelay = artifacts.require('MockWitnetRequestsBoard');

contract('Season', (accounts) => {
  const MatchState = {
    SCHEDULED: 0,
    BUILD_UP: 1,
    IN_PROGRESS: 2,
    ENDED: 3,
  };

  const BetType = {
    WIN: 0,
    LOSE: 1,
    DRAW: 2,
  };

  let season;
  let witnet;
  let wbi;
  let blockRelay;

  before(async () => {
    blockRelay = await BlockRelay.deployed({ from: accounts[0] });
    witnet = await Witnet.new();
    await SeasonTestHelper.link('Witnet', witnet.address);
    wbi = (await WRBTestHelper.new(blockRelay.address, 0)).address;
    const noOfTeams = 20;
    const betFee = web3.utils.toWei('10', 'wei');
    const matchBuildUpDuration = 1 * 60 * 60; // 1 hr in seconds

    season = await SeasonTestHelper.new(
      wbi,
      noOfTeams,
      betFee,
      matchBuildUpDuration
    );
  });

  describe('Place bets: ', () => {
    const matchDate = moment.utc();
    const beforeMatchDate = moment.utc().subtract(2, 'hours');
    const afterMatchDate = moment.utc().add(2, 'hours');

    it('Should set timestamp to now', async () => {
      await season.setNow(beforeMatchDate.unix(), {
        from: accounts[1],
      });
      assert.equal(beforeMatchDate.unix(), await season.getNow.call());
    });
    it('should compute match id', async () => {
      const result = await season.getMatchId.call(0, 1);
      assert.equal(
        result,
        '0x49d03a195e239b52779866b33024210fc7dc66e9c2998975c0aa45c1702549d5'
      );
    });
    it('should read that there is no bet', async () => {
      assert.equal(
        (await season.getMatchTotalBetsAmount.call(0, 1)).toNumber(),
        web3.utils.toWei('0', 'ether')
      );
    });
    it('should revert due to 0 value bet amount', async () => {
      await truffleAssert.reverts(
        season.placeBet(0, 1, BetType.WIN, {
          from: accounts[0],
          value: web3.utils.toWei('0', 'wei'),
        }),
        'Should insert a positive amount'
      );
    });
    it('should revert due to value being less than bet fee', async () => {
      await truffleAssert.reverts(
        season.placeBet(0, 1, BetType.WIN, {
          from: accounts[0],
          value: web3.utils.toWei('9', 'wei'),
        }),
        'Should be greater than bet fee'
      );
      await truffleAssert.reverts(
        season.placeBet(0, 1, BetType.WIN, {
          from: accounts[0],
          value: web3.utils.toWei('10', 'wei'),
        }),
        'Should be greater than bet fee'
      );
    });
    it('should be able to place bet', async () => {
      await season.setMatchStartTime(0, 1, matchDate.unix(), {
        from: accounts[1],
      });
      await season.placeBet(0, 1, BetType.WIN, {
        from: accounts[0],
        value: web3.utils.toWei('11', 'wei'),
      });
    });
    it('should read the total amount of previous bet', async () => {
      assert.equal(
        (await season.getMatchTotalBetsAmount.call(0, 1)).toNumber(),
        web3.utils.toWei('1', 'wei')
      );
    });
    it('should be able to place a second bet', async () => {
      await season.placeBet(0, 1, BetType.WIN, {
        from: accounts[0],
        value: web3.utils.toWei('2009', 'wei'),
      });
    });
    it('should read the total amount of the match', async () => {
      assert.equal(
        (await season.getMatchTotalBetsAmount.call(0, 1)).toNumber(),
        web3.utils.toWei('2000', 'wei')
      );
    });
    it('should read my total bets of the match', async () => {
      assert.equal(
        (await season.getMyMatchTotalBetsAmount.call(0, 1)).toNumber(),
        web3.utils.toWei('2000', 'wei')
      );
      assert.equal(
        (await season.getMyMatchTotalBetsAmount.call(1, 0)).toNumber(),
        web3.utils.toWei('0', 'wei')
      );
    });
    it('should be able to place a third bet from another address', async () => {
      await season.setMatchStartTime(6, 5, matchDate.unix(), {
        from: accounts[1],
      });
      await season.placeBet(6, 5, BetType.WIN, {
        from: accounts[1],
        value: web3.utils.toWei('1010', 'wei'),
      });
    });
    it('should read bets from another address', async () => {
      assert.equal(
        (await season.getMatchTotalBetsAmount.call(6, 5)).toNumber(),
        web3.utils.toWei('1000', 'wei')
      );
      assert.equal(
        (await season.getMatchTotalBetsAmount.call(0, 1)).toNumber(),
        web3.utils.toWei('2000', 'wei')
      );
      assert.equal(
        await season.getMatchTotalBetsAmount.call(1, 0),
        web3.utils.toWei('0', 'wei')
      );

      assert.equal(
        (
          await season.getMyMatchTotalBetsAmount.call(6, 5, {
            from: accounts[1],
          })
        ).toNumber(),
        web3.utils.toWei('1000', 'wei')
      );
      assert.equal(
        (
          await season.getMyMatchTotalBetsAmount.call(0, 1, {
            from: accounts[1],
          })
        ).toNumber(),
        web3.utils.toWei('0', 'wei')
      );
      assert.equal(
        (
          await season.getMyMatchTotalBetsAmount.call(1, 0, {
            from: accounts[1],
          })
        ).toNumber(),
        web3.utils.toWei('0', 'wei')
      );
    });
    it('should compute match state correctly', async () => {
      await season.setNow(beforeMatchDate.unix(), {
        from: accounts[1],
      });
      assert.equal(
        (await season.getMatchState.call(0, 1)).toNumber(),
        MatchState.SCHEDULED,
        'match init'
      );
      //
      await season.setNow(
        moment.utc(matchDate).subtract(58, 'minutes').unix(),
        {
          from: accounts[1],
        }
      );
      assert.equal(
        (await season.getMatchState.call(0, 1)).toNumber(),
        MatchState.BUILD_UP,
        'match build up'
      );
      //
      await season.setNow(moment.utc(matchDate).add(1, 'hours').unix(), {
        from: accounts[1],
      });
      assert.equal(
        (await season.getMatchState.call(0, 1)).toNumber(),
        MatchState.IN_PROGRESS,
        'match in progress'
      );
      //
      await season.setMatchEndTime(0, 1, afterMatchDate.unix(), {
        from: accounts[1],
      });
      assert.equal(
        (await season.getMatchState.call(0, 1)).toNumber(),
        MatchState.ENDED,
        'match ended'
      );
    });
    it('should be able to bet if pre match build up', async () => {
      await season.setMatchStartTime(0, 1, matchDate.unix(), {
        from: accounts[1],
      });
      await season.setNow(beforeMatchDate.unix(), {
        from: accounts[1],
      });
      assert.equal(
        (await season.getMatchState.call(0, 1)).toNumber(),
        MatchState.SCHEDULED,
        'match init'
      );
      //
      await season.placeBet(0, 1, BetType.WIN, {
        from: accounts[0],
        value: web3.utils.toWei('1010', 'wei'),
      });
      assert.equal(
        (await season.getMatchTotalBetsAmount.call(0, 1)).toNumber(),
        web3.utils.toWei('3000', 'wei')
      );
    });
    it('should revert bet attempt if match is building up', async () => {
      await season.setNow(
        moment.utc(matchDate).subtract(58, 'minutes').unix(),
        {
          from: accounts[0],
        }
      );
      assert.equal(
        (await season.getMatchState.call(0, 1)).toNumber(),
        MatchState.BUILD_UP,
        'match build up'
      );
      await truffleAssert.reverts(
        season.placeBet(0, 1, BetType.WIN, {
          from: accounts[0],
          value: web3.utils.toWei('1010', 'wei'),
        }),
        'Betting window is not closed'
      );
    });
    it('should revert bet attempt if match is in progress', async () => {
      await season.setNow(moment.utc(matchDate).add(5, 'minutes').unix(), {
        from: accounts[0],
      });
      await season.setMatchEndTime(0, 1, 0, {
        from: accounts[1],
      });
      assert.equal(
        (await season.getMatchState.call(0, 1)).toNumber(),
        MatchState.IN_PROGRESS,
        'match is in progress'
      );
      await truffleAssert.reverts(
        season.placeBet(0, 1, BetType.WIN, {
          from: accounts[0],
          value: web3.utils.toWei('1010', 'wei'),
        }),
        'Betting window is not closed'
      );
    });
    it('should revert bet attempt if match is played', async () => {
      await season.setMatchEndTime(0, 1, afterMatchDate.unix(), {
        from: accounts[1],
      });
      assert.equal(
        (await season.getMatchState.call(0, 1)).toNumber(),
        MatchState.ENDED,
        'match ended'
      );
      await truffleAssert.reverts(
        season.placeBet(0, 1, BetType.WIN, {
          from: accounts[0],
          value: web3.utils.toWei('1010', 'wei'),
        }),
        'Betting window is not closed'
      );
    });
    // it('should be able to place a bet in the second day', async () => {
    //   const tx = season.placeBet(6, {
    //     from: accounts[1],
    //     value: web3.utils.toWei('1000', 'wei'),
    //   });
    //   waitForHash(tx);
    // });
    // it('should be able to place a second bet in the second day', async () => {
    //   const tx = season.placeBet(3, {
    //     from: accounts[2],
    //     value: web3.utils.toWei('1000', 'wei'),
    //   });
    //   waitForHash(tx);
    // });
    // it('should revert due to bet are not in RESOLVE state', async () => {
    //   await truffleAssert.reverts(
    //     season.resolve(0, {
    //       from: accounts[0],
    //       value: 2,
    //     }),
    //     'Should be in RESOLVE state'
    //   );
    // });
    // it('should get day state RESOLVE because (for 2 days ago with bets)', async () => {
    //   const tx = season.setNow(now2, {
    //     from: accounts[1],
    //   });
    //   waitForHash(tx);
    //   const result = await season.getDayState.call(0);
    //   assert.equal(result.toNumber(), DayState.RESOLVE);
    // });
    // it('should revert due to have not enough value to resolve the data request', async () => {
    //   const tx = season.setNow(now2, {
    //     from: accounts[1],
    //   });
    //   waitForHash(tx);
    //   await truffleAssert.reverts(
    //     season.resolve(0, {
    //       from: accounts[0],
    //       value: 0,
    //     }),
    //     'Not enough value to resolve the data request'
    //   );
    // });
    // it('should revert due to bet are not in WAIT_RESULT or PAYOUT state', async () => {
    //   await truffleAssert.reverts(
    //     season.payout(0, {
    //       from: accounts[0],
    //     }),
    //     'Should be in WAIT_RESULT or PAYOUT state'
    //   );
    // });
    // it('should get day state WAIT_RESULT after calling resolve)', async () => {
    //   const tx = season.setNow(now2, {
    //     from: accounts[1],
    //   });
    //   waitForHash(tx);
    //   const resolveTx = season.resolve(0, {
    //     from: accounts[1],
    //     value: 2,
    //   });
    //   waitForHash(resolveTx);
    //   const result = await season.getDayState.call(0, {
    //     from: accounts[1],
    //   });
    //   assert.equal(result.toNumber(), DayState.WAIT_RESULT);
    // });
    // it('should revert when trying to read a result that is not ready', async () => {
    //   await truffleAssert.reverts(
    //     season.payout.call(0, {
    //       from: accounts[0],
    //     }),
    //     'Found empty buffer when parsing CBOR value'
    //   );
    // });
    // it('should get day state WAIT_RESULT after calling resolve the second day', async () => {
    //   const tx = season.setNow(now3, {
    //     from: accounts[1],
    //   });
    //   waitForHash(tx);
    //   const resolveTx = season.resolve(1, {
    //     from: accounts[1],
    //     value: 2,
    //   });
    //   waitForHash(resolveTx);
    //   const result = await season.getDayState.call(1, {
    //     from: accounts[1],
    //   });
    //   assert.equal(result.toNumber(), DayState.WAIT_RESULT);
    // });
    it('should call payout with successful result and refund witnet', async () => {
      const resBytes = web3.utils.hexToBytes(
        '0x8A1A0001869F02030405060708090A'
      );
      let balanceBefore = await web3.eth.getBalance(season.address);
      await wbi.setDrResult(resBytes, 1, {
        from: accounts[1],
      });
      await season.payout(0, {
        from: accounts[0],
      });

      let balanceAfter = await web3.eth.getBalance(season.address);
      assert.equal(parseInt(balanceAfter), parseInt(balanceBefore) - 3000);
    });
    it('should revert because contestant already paid', async () => {
      await truffleAssert.reverts(
        season.payout(0, {
          from: accounts[0],
        }),
        'Address already paid'
      );
    });
    it('should revert because contestant has no bets in the winning token', async () => {
      await truffleAssert.reverts(
        season.payout(0, {
          from: accounts[2],
        }),
        'Address has no bets in the winning token'
      );
    });
    it('should call payout with unsuccessful result and pay each one their bet', async () => {
      const resBytes = web3.utils.hexToBytes(
        '0xD8270001869F02030405060708090A'
      );
      let balanceBefore = await web3.eth.getBalance(season.address);
      await wbi.setDrResult(resBytes, 2, {
        from: accounts[1],
      });
      await season.payout(1, {
        from: accounts[1],
      });

      let balanceAfter = await web3.eth.getBalance(season.address);
      assert.equal(parseInt(balanceAfter), parseInt(balanceBefore) - 1000);
    });
  });
});
