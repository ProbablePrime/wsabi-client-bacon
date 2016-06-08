module.exports = function (status) {
	if (typeof status !== "number") {
		return false;
	}
	return status >= 200 && status < 400;
}
