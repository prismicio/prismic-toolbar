const ltIE11 = window.navigator.userAgent.indexOf("MSIE ") > 0;
const isIE11 = window.navigator.userAgent.indexOf("Trident/") > 0;
const isIE = ltIE11 || isIE11;

if (isIE) {
	throw new Error("Prismic does not support Internet Explorer.");
}
