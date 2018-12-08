function getSubgroups(count) {
	// this is used to get array like that [0,0,0,1,1,1,1,2,2,2,2...]
	var out = [];
	var currSub = 0;
	for(var i=0; i<count; i++) {
		if((i - count/10) < (count-(10-currSub)*(count/10))){
			out.push(currSub);
		}else{
			currSub++;
			out.push(currSub);
		}
	}
	return out;
}

function getRandomSymb() {
	var x = Math.random();
	if(x<0.1) {
		return '0';
	} else if(x<0.2){
		return '1';
	} else if(x<0.3){
		return '2';
	} else if(x<0.4){
		return '3';
	} else if(x<0.5){
		return '4';
	} else if(x<0.6){
		return '5';
	} else{
		return 'a';
	}
}

function getPolicyholders(count) {
	var arr = [];
	for(var i=0; i<count; i++) {
		var addr = '0x';
		for(var j=0; j<40; j++) {
			addr += getRandomSymb();
		}	
		arr.push(addr);
	}
	return arr;
}

async function payPremium(daiContract, tandaPayLedger, backend, id, pc) {
	var amountToPay = await tandaPayLedger.getNeededAmount(id, pc);
	await daiContract.mint(pc, amountToPay, {from:backend}).should.be.fulfilled;
	await daiContract.approve(tandaPayLedger.address, amountToPay, {from:pc}).should.be.fulfilled;
	await tandaPayLedger.commitPremium(id, amountToPay, {from:pc}).should.be.fulfilled;
}

function isInArray(arr, o) {
	var out = false;
	for(var i=0; i<arr.length; i++) {
		if(arr[i]==o) {
			out = true;
		}
	}
	return out;
}

const getGroupId = tx=> tx.logs.filter(l => l.event == 'NewGroup')[0].args._groupId.toNumber();
const getClaimId = tx=> tx.logs.filter(l => l.event == 'NewClaim')[0].args._claimId.toNumber();

module.exports.getSubgroups = getSubgroups;
module.exports.getPolicyholders = getPolicyholders;
module.exports.payPremium = payPremium;
module.exports.getGroupId = getGroupId;
module.exports.getClaimId = getClaimId;
module.exports.isInArray = isInArray;
