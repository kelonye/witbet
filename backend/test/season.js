const truffleAssert = require('truffle-assertions');
const Witnet = artifacts.require('Witnet');
const WRBTestHelper = artifacts.require('WitnetRequestsBoardTestHelper');
const SeasonTestHelper = artifacts.require('SeasonTestHelper');
const BlockRelay = artifacts.require('MockWitnetRequestsBoard');

contract('Season', (accounts) => {
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
    const witnetRequestFee = web3.utils.toWei('1', 'wei');
    const betFee = web3.utils.toWei('1', 'wei');

    season = await SeasonTestHelper.new(
      wbi,
      noOfTeams,
      witnetRequestFee,
      betFee
    );
  });

  describe('Place bets: ', () => {
    const day0 = Math.round(new Date().getTime() / 1000);
    // const now1 = day0 + 26 * 60 * 60;
    // const now2 = day0 + 52 * 60 * 60;
    // const now3 = day0 + 74 * 60 * 60;

    it('Should set timestamp to now', async () => {
      const tx = season.setTimestamp(day0, {
        from: accounts[1],
      });
      waitForHash(tx);
      const result = await season.getTimestamp.call();
      assert.equal(day0, result);
    });
    it('should compute match id', async () => {
      const result = await season.getMatchId.call(0, 1);
      assert.equal(
        result,
        '0x49d03a195e239b52779866b33024210fc7dc66e9c2998975c0aa45c1702549d5'
      );
    });
    it('should read that there is no bet', async () => {
      const result = await season.getMatchTotalBetsAmount.call(0, 1);
      assert.equal(result, web3.utils.toWei('0', 'ether'));
    });
    it('should be able to place bet', async () => {
      const tx = season.placeBet(0, 1, {
        from: accounts[0],
        value: web3.utils.toWei('1000', 'wei'),
      });
      waitForHash(tx);
    });
    it('should be revert due to place bet with 0 value', async () => {
      await truffleAssert.reverts(
        season.placeBet(0, 1, {
          from: accounts[0],
          value: web3.utils.toWei('0', 'wei'),
        }),
        'Should insert a positive amount'
      );
    });
    it('should read the total amount of previous bet', async () => {
      const result = await season.getMatchTotalBetsAmount.call(0, 1);
      assert.equal(result, web3.utils.toWei('1000', 'wei'));
    });
    it('should be able to place a second bet', async () => {
      const tx = season.placeBet(0, 1, {
        from: accounts[0],
        value: web3.utils.toWei('1000', 'wei'),
      });
      waitForHash(tx);
    });
    it('should read the total amount of the match', async () => {
      const result = await season.getMatchTotalBetsAmount.call(0, 1);
      assert.equal(result, web3.utils.toWei('2000', 'wei'));
    });
    it('should read my total bets of the match', async () => {
      const result = await season.getMyMatchTotalBetsAmount.call(0, 1);
      assert.equal(result, web3.utils.toWei('2000', 'wei'));
    });
    it('should be able to place a third bet from another address', async () => {
      const tx = season.placeBet(6, 5, {
        from: accounts[1],
        value: web3.utils.toWei('1000', 'wei'),
      });
      waitForHash(tx);
    });
    it('should read bets from another address', async () => {
      const result = await season.getMyMatchTotalBetsAmount.call(6, 5, {
        from: accounts[1],
      });
      assert.equal(result, web3.utils.toWei('1000', 'wei'));
    });
  });
});

function waitForHash(txQ) {
  return new Promise((resolve, reject) =>
    txQ.on('transactionHash', resolve).catch(reject)
  );
}
