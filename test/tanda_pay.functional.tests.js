var TandaPayLedger = artifacts.require("./TandaPayLedger");
var DaiContract = artifacts.require("./DaiContract");

const time = require('./helpers/time');
const {  isInArray,
	    getSubgroups, 
	    getPolicyholders,
	    payPremium, 
	    getGroupId,
	    getClaimId } = require("./helpers/helpers.js");

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

contract('TandaPayLedger|Functional', (accounts) => {
	const backend = accounts[0];
	const secretary = accounts[1];
	const secretary2 = accounts[3];
	const cronAccount = accounts[2];
	const outsider = accounts[9];

	var daiContract;
	var tandaPayLedger; 
	var id = 0;

	var GROUP_SIZE_AT_CREATION_MIN = 50;
	var GROUP_SIZE_AT_CREATION_MAX = 55;
	var MONTH_TO_REPAY_LOAN_MIN = 3;
	var MONTH_TO_REPAY_LOAN_MAX = 255;

	var policyholders = getPolicyholders(GROUP_SIZE_AT_CREATION_MIN);
	policyholders[0] = accounts[4];
	policyholders[1] = accounts[5];
	policyholders[2] = accounts[6];
	policyholders[3] = accounts[7];
	policyholders[4] = accounts[8];
	policyholders[5] = accounts[3];	
	var policyholderSubgroups = getSubgroups(GROUP_SIZE_AT_CREATION_MIN);
	var monthToRepayTheLoan = MONTH_TO_REPAY_LOAN_MIN;
	var premiumCostDai = 20e18;
	var maxClaimDai = 500e18;
	
	beforeEach(async() => {
		daiContract = await DaiContract.new();
		tandaPayLedger = await TandaPayLedger.new(daiContract.address, backend, cronAccount);		
		var tx = await tandaPayLedger.
			createNewTandaGroup(
				secretary,
				policyholders, 
				policyholderSubgroups, 
				monthToRepayTheLoan, 
				premiumCostDai, 
				maxClaimDai, 
				{from:backend}).should.be.fulfilled;
		var id = await getGroupId(tx);

	});

	describe('Functional tests', function(){
		beforeEach(async() => {
		});

		it('Should...',async() => {
			// 
		});
	});
});
