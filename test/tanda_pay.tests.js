var DaoBaseWithUnpackers = artifacts.require('./DaoBaseWithUnpackers');
var StdDaoToken = artifacts.require('./StdDaoToken');
var DaoStorage = artifacts.require('./DaoStorage');
var DaoBaseWithUnpackers = artifacts.require('./DaoBaseWithUnpackers');
var GenericProposal = artifacts.require("./GenericProposal");
var DaoClient = artifacts.require("./DaoClient");

// to check how upgrade works with IDaoBase clients

var MoneyFlow = artifacts.require('./MoneyFlow');
var IWeiReceiver = artifacts.require('./IWeiReceiver');
var IProposal = artifacts.require('./IProposal');

function KECCAK256 (x) {
  return web3.sha3(x);
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('ITandaPayLedger', (accounts) => {
  const creator = accounts[0];

  before(async() => {

  });

  beforeEach(async() => {

  });

  describe('addObserver()', function () {
    it('Should add observer to daoBase',async() => {
    });
  });
});
