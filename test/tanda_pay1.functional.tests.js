var TandaPayLedger = artifacts.require("./TandaPayLedger");

require('chai')
	.use(require('chai-as-promised'))
	.use(require('chai-bignumber')(web3.BigNumber))
	.should();

contract('TandaPayLedger (functional tests #1)', (accounts) => {
	const creator = accounts[0];

	before(async() => {

	});

	beforeEach(async() => {

	});

	// default params (50 group members, $20 premium, etc) 
	// creating 3 periods and accpeting 2 claims
	// no accepts/rejects by policyholders! all policyholder in this case are LOYALISTs by default
	describe('3 periods and accept 2 claims during P1', function(){
		beforeEach(async() => {

		});

		it('should create new group', async()=>{
					
		});

		it('P1 - all policyholders should pay all premiums', async()=>{
					
		});

		it('P1 - should move time to active period', async()=>{
					
		});

		it('P1 - should open 2 claims', async()=>{
					
		});

		it('P1 - should move time to next period', async()=>{
			// no accepts/rejects by policyholders! all policyholder in this case are LOYALISTs by default
		});

		it('P1 - should send all payments to claimants', async()=>{
			// 1 - claimant1 should receive $500
			// 2 - claimant2 should receive $500
			//
			// 3 - check the current group balance and all math.
			// use this method:
			//
			// function getGroupInfo2(uint _groupID) public view
			//	returns(uint premiumsTotalDai, uint overpaymentTotalDai, uint loanRepaymentTotalDai);
		});

		// second period starts
		it('P2 - all policyholders should pay all premiums', async()=>{
			// 1 - check that there are no open claims here	
			// 
		});

		it('P2 - should move time to active period', async()=>{
					
		});

		it('P2 - should open NO claims', async()=>{
					
		});

		it('P2 - should move time to next period', async()=>{
			// no accepts/rejects by policyholders! all policyholder in this case are LOYALISTs by default
			//
			// 3 - check the current group balance and all math.
			// use this method:
			//
			// function getGroupInfo2(uint _groupID) public view
			//	returns(uint premiumsTotalDai, uint overpaymentTotalDai, uint loanRepaymentTotalDai);
		});
	});
});
