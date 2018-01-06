var maxvalue = 100;
var noiseAmplitude = maxvalue * parseFloat(process.argv[2]);
for (var i = 0; i < maxvalue; i += 0.5) {
	console.log(i +  ',' + (i + (Math.random() - 0.5) * noiseAmplitude));
}