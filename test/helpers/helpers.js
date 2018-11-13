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

function getPolicyholders(count) {
	return accounts.slice(10, count+10);
}

function getPremiumFor(id, pc) {
	var data = await tandaPayLedger.getAmountToPay();
	var amountToPay = data[0].toNumber() + data[1].toNumber() + data[2].toNumber();
	await daiContract.mint(pc, amountToPay, {from:backend}).should.be.fulfilled;
	await daiContract.approve(tandaPayLedger.address, amountToPay, {from:pc}).should.be.fulfilled;
	await tandaPayLedger.commitPremium(id, amountToPay, {from:pc}).should.be.fulfilled;	
}

function getGroupId(tx) {
	return {};
}

module.exports.getSubgroups = getSubgroups;
module.exports.getPolicyholders = getPolicyholders;
module.exports.getPremiumFor = getPremiumFor;
module.exports.getGroupId = getGroupId;