var TandaPayLedger = artifacts.require("./TandaPayLedger");

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

  describe('transferBackendAccount()', function () {
    it('Should not be callable by non backend account',async() => {
    });

    it('Should change the backend account',async() => {
    });
  });

  describe('transferCronAccount()', function () {
    it('Should not be callable by non backend account',async() => {
    });

    it('Should change the cron account',async() => {
    });
  });

  describe('createNewTandaGroup()', function () {
    it('Should not be callable by non backend account',async() => {
    });

    it('Should not be callable with different count of _policyholders and _policyholderSubgroups',async() => {
    });

    it('Should not be callable with _policyholders.count less than GROUP_SIZE_AT_CREATION_MIN',async() => {
    });

    it('Should not be callable with _policyholders.count more than GROUP_SIZE_AT_CREATION_MAX',async() => {
    });
  });
});
