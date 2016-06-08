const expect = require('chai').expect;

const checkStatus = require('../../lib/checkStatus.js');

describe('Utilities', () => {
	describe('Status checking', () => {
		it('returns true for successful http statuses', () => {
			//Only ones we're likely to see ¯\_(ツ)_/¯
			expect(checkStatus(200)).to.be.ok;
			expect(checkStatus(204)).to.be.ok;
		});
	});
});
