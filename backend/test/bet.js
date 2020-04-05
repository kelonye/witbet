const Witnet = artifacts.require('Witnet');
const WRBTestHelper = artifacts.require('WitnetRequestsBoardTestHelper');
const BetTestHelper = artifacts.require('BetTestHelper');
const BlockRelay = artifacts.require('MockWitnetRequestsBoard');

contract('Bet', (accounts) => {
  let bet;
  let witnet;
  let wbi;
  let blockRelay;

  before(async () => {
    blockRelay = await BlockRelay.deployed({ from: accounts[0] });
    witnet = await Witnet.new();
    await BetTestHelper.link('Witnet', witnet.address);
    wbi = (await WRBTestHelper.new(blockRelay.address, 0)).address;
    const witnetRequestFee = web3.utils.toWei('1', 'wei');
    const betFee = web3.utils.toWei('1', 'wei');

    bet = await BetTestHelper.new(wbi, witnetRequestFee, betFee);
  });

  describe('Place bets: ', () => {
    const day0 = Math.round(new Date().getTime() / 1000);
    // const now1 = day0 + 26 * 60 * 60;
    // const now2 = day0 + 52 * 60 * 60;
    // const now3 = day0 + 74 * 60 * 60;

    it('Should set timestamp to now', async () => {
      const tx = bet.setTimestamp(day0, {
        from: accounts[1],
      });
      waitForHash(tx);
      const result = await bet.getTimestamp.call();
      assert.equal(day0, result);
    });
  });
});

function waitForHash(txQ) {
  return new Promise((resolve, reject) =>
    txQ.on('transactionHash', resolve).catch(reject)
  );
}
