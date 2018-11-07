var TandaPayLedger = artifacts.require("./TandaPayLedger");

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('TandaPayLedger', (accounts) => {
  const creator = accounts[0];

  before(async() => {

  });

  beforeEach(async() => {

  });

	describe('ITandaPayLedgerInfo interface', function(){

		describe('getTandaGroupCountForSecretary()', function () {
			// TODO:
			it('Should ...',async() => {
			});
		});

		describe('getTandaGroupIDForSecretary()', function () {
			// TODO:
			it('Should ...',async() => {
			});
		});

		describe('getTandaGroupCount()', function () {
			// TODO:
			it('Should ...',async() => {
			});
		});

		describe('getTandaGroupID()', function () {
			// TODO:
			it('Should ...',async() => {
			});
		});

		describe('getGroupInfo()', function () {
			// TODO:
			it('Should ...',async() => {
			});
		});

		describe('getGroupInfo2()', function () {
			// TODO:
			it('Should ...',async() => {
			});
		});

		describe('getSubgroupInfo()', function () {
			// TODO:
			it('Should ...',async() => {
			});
		});

		describe('getPolicyholderInfo()', function () {
			// TODO:
			it('Should ...',async() => {
			});
		});

		describe('getAmountToPay()', function () {
			// TODO: add a lot of tests here!
			it('Should ...',async() => {
			});
		});

		describe('getCurrentPeriodInfo()', function () {
			// TODO: add a lot of tests here!
			it('Should ...',async() => {
			});
		});

		describe('getClaimCount()', function () {
			// TODO: add a lot of tests here!
			it('Should ...',async() => {
			});
		});

		describe('getClaimInfo()', function () {
			// TODO: add a lot of tests here!
			it('Should ...',async() => {
			});
		});

		describe('getClaimInfo2()', function () {
			// TODO: add a lot of tests here!
			it('Should ...',async() => {
			});
		});
	});

});
